// One GitHub request: the REST API with a token (`path` like `/user/repos`), or
// the OAuth endpoints on github.com itself (`site: true`, form-encoded, no
// token). Answers the parsed JSON; a failed API call throws GitHub's message.
export default async function (ctx: Context, _session: Session | null, opts: {
    path: string; method?: string; token?: string; body?: Record<string, unknown>; site?: boolean;
}) {
    const config = ctx.fns.procs.config.resolve({ module: "repo" });
    const base = String(opts.site ? config.githubUrl : config.githubApi).replace(/\/$/, "");
    const headers: Record<string, string> = { accept: opts.site ? "application/json" : "application/vnd.github+json", "user-agent": "bot-machine-repo" };
    if (!opts.site) headers["x-github-api-version"] = "2022-11-28";
    if (opts.token) headers.authorization = `Bearer ${opts.token}`;
    let body: string | undefined;
    if (opts.body && opts.site) { headers["content-type"] = "application/x-www-form-urlencoded"; body = new URLSearchParams(opts.body as Record<string, string>).toString(); }
    else if (opts.body) { headers["content-type"] = "application/json"; body = JSON.stringify(opts.body); }
    const res = await fetch(`${base}${opts.path}`, { method: opts.method ?? (body ? "POST" : "GET"), headers, body, signal: AbortSignal.timeout(20_000) });
    const data: any = await res.json().catch(() => ({}));
    if (!opts.site && !res.ok) {
        const detail = Array.isArray(data?.errors) ? data.errors.map((e: any) => e?.message || e?.code).filter(Boolean).join("; ") : "";
        throw new Error(`GitHub: ${data?.message || res.statusText || res.status}${detail ? ` (${detail})` : ""}`);
    }
    return data;
}
