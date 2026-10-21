// Open something in the right pane. Either a URL — the plugin pages carry their
// whole state in one (`/questionnaire?q=tobacco`), which is the shortest way to
// put the user in front of something — or an entity, whose own link is followed.
//
// Navigation stays partial: htmx swaps the pane and pushes the URL, so the chat,
// the event stream and this bridge stay alive. A full reload drops all three.
//
// **What comes back is the browser snapshot they are now looking at.** Opening
// a page and asking what is on it were two calls, and the second one is the one
// that gets forgotten — so an agent says "here is the list" about a page it
// never read, and an empty one looks exactly like a full one from where it is
// standing. By default the return is exactly the same semantic model as
// `screen.read({ mode: "browser" })`; `read: false` returns only the navigation
// result when the snapshot cannot matter.
//
// **No visible tab is not a failure — it is a queue.** The person has gone to
// another tab (or another room); an agent that has finished the build used to
// get "no active screen tab" and stop, leaving its last step spinning until
// they came back. Now the open is kept (`ctx.state.screen.deferred`) and
// answered `{ deferred: true }`; when a tab says it is visible again
// (`POST /screen/here`), the page opens there. So "when you are back, the
// dashboard is open" is something the workspace does, not something the agent
// has to wait around to do.
export default async function (ctx: Context, _session: Session | null, opts: { url?: string } & types.screen.Descriptor & { show?: boolean; settleMs?: number; read?: boolean; tabId?: string; actions?: types.screen.OpenAction[] }) {
    const verb = opts.url ? "go" : "open";
    let result: any;
    try {
        result = await ctx.fns.screen.eval({ tabId: opts.tabId, code: `
        const opened = await window.page.${verb}(${JSON.stringify(opts)});
        const flow = await window.page.flow(${JSON.stringify(opts.actions ?? [])});
        return { opened, steps: flow.steps };
    `, timeoutMs: flowTimeout(opts.actions ?? []) });
    } catch (error: any) {
        if (!/no visible workspace tab|no page answered/.test(String(error?.message ?? error))) throw error;
        const page = (ctx.state.screen ??= { nextId: 1, pending: new Map() } as any);
        page.deferred = { opts: { ...opts, actions: undefined, read: false }, at: new Date().toISOString() };
        return { deferred: true, url: opts.url, note: "no visible tab — it opens on the person's tab the moment one is visible; say it in words, do not wait" };
    }
    await Bun.sleep(opts.settleMs ?? 120);   // the swap is already done — this is for paint
    if (opts.read === false) return result;

    // A tab that navigated on, closed, or answered slowly is not an error to
    // raise here: the opening itself succeeded, which is what was asked for.
    const screen = await ctx.fns.screen.read({ mode: "browser", tabId: opts.tabId }).catch(() => null);
    return screen ? { ...screen, steps: result?.steps ?? [] } : result;
}

function flowTimeout(actions: types.screen.OpenAction[]): number {
    const waits = actions.reduce((sum, step) => sum + ("waitFor" in step ? Math.min(30_000, Math.max(1, step.waitFor.timeoutMs ?? 5_000)) : 0), 0);
    // Opening is an interactive browser command, not a background job. A busy
    // tab must fail fast instead of holding the calling REPL request for 20s;
    // explicit waitFor steps still receive the time they asked for.
    return Math.min(60_000, 2_000 + waits);
}
