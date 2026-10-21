// Read one semantic screen through a single contract. Server mode renders a URL
// in-process and parses its HTML without Chrome; browser mode reads the already
// open tab and adds live visibility/geometry. Reading in browser mode never
// navigates — call screen.open explicitly when showing something to the user.
export default async function (
    ctx: Context,
    _session: Session | null,
    opts: {
        mode?: "server" | "browser";
        url?: string;
        tabId?: string;
        waitFor?: (types.screen.Descriptor & { status?: string; text?: string; absent?: boolean });
        timeoutMs?: number;
        scope?: "main" | "chat" | "body";
        text?: boolean;
        maxText?: number;
    },
): Promise<types.screen.ScreenSnapshot | ({ source: "server"; url: string; status: number; durationMs: number; error: string })> {
    const mode = opts.mode ?? (opts.url ? "server" : "browser");
    if (mode === "browser") {
        if (opts.url) throw new Error("screen.read browser mode reads the open tab; call screen.open({ url }) before it");
        const stateOpts = { scope: opts.scope, text: opts.text, maxText: opts.maxText };
        const waitTimeout = Math.min(30_000, Math.max(1, opts.timeoutMs ?? 5_000));
        const code = opts.waitFor
            ? `return await window.page.waitFor(${JSON.stringify(opts.waitFor)}, ${JSON.stringify(stateOpts)}, ${waitTimeout})`
            : `return window.page.state(${JSON.stringify(stateOpts)})`;
        return await ctx.fns.screen.eval({ tabId: opts.tabId, timeoutMs: waitTimeout + 1_000, code });
    }
    if (!opts.url) throw new Error("screen.read server mode needs url");

    const started = performance.now();
    const response = await ctx.fns.procs.http.dispatch({ url: opts.url, headers: { accept: "text/html" } }).catch(() => null);
    if (!response) return { source: "server" as const, url: opts.url, status: 0, durationMs: Math.round(performance.now() - started), error: "dispatch failed" };
    const html = await response.text();
    const parsed = await ctx.fns.screen.parse({ html, scope: opts.scope === "body" ? "body" : "main" });
    const markers = parsed.markers;
    const first = (key: keyof types.screen.Marker) => markers.find((marker: types.screen.Marker) => marker[key])?.[key];
    return {
        source: "server" as const,
        url: opts.url,
        status: response.status,
        durationMs: Math.round(performance.now() - started),
        page: first("page") ?? null,
        headings: parsed.headings,
        links: parsed.links,
        sections: markers.filter((m: types.screen.Marker) => m.own.includes("section")),
        entities: markers.filter((m: types.screen.Marker) => m.own.includes("entity")),
        actions: markers.filter((m: types.screen.Marker) => m.own.includes("action")),
        forms: markers.filter((m: types.screen.Marker) => m.own.includes("form")),
        fields: markers.filter((m: types.screen.Marker) => m.own.includes("field")),
        roles: markers.filter((m: types.screen.Marker) => m.own.includes("role")),
        tables: parsed.tables,
        diagnostics: parsed.diagnostics,
        markers,
        text: opts.text === false ? undefined : parsed.text.slice(0, Math.max(0, opts.maxText ?? 4000)),
    };
}
