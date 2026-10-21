// POST /screen/here — the open tab saying where it is.
//
// `readScreen` asks and waits: it pushes code down the event stream, the browser
// answers, and the round trip only works while somebody has the page open. That
// is right for "what exactly is on screen", and far too heavy for "where is the
// person" — a question worth answering before every single reply.
//
// So the tab volunteers it: one beacon per settle, no answer wanted, and the
// server keeps the last one. It is a fact about a browser, so it can be stale by
// a click; anything that must be exact still asks.
export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const said: any = await opts.req.json().catch(() => null);
    if (said?.url) {
        const state = (ctx.state.screen ??= { nextId: 1, pending: new Map() } as any);
        const tabId = String(said.tabId ?? "legacy");
        const here = {
            tabId,
            connectionId: String(said.connectionId ?? "legacy"),
            url: String(said.url), title: String(said.title ?? ""), page: said.page ?? null,
            visible: Boolean(said.visible), focused: Boolean(said.focused),
            lifecycle: String(said.lifecycle ?? "active"),
            lastInteractionAt: Number(said.lastInteractionAt ?? 0),
            at: new Date().toISOString(),
        };
        (state.tabs ??= {})[tabId] = here;
        const current = state.here;
        if (here.lifecycle !== "closed" && (here.focused || !current || Date.parse(current.at) < Date.parse(here.at))) state.here = here;
        // A page an agent asked to open while no tab was visible: this tab is
        // visible now, so open it here — once, and only if the ask is fresh.
        const deferred = state.deferred;
        if (deferred && here.visible && here.lifecycle === "active" && Date.now() - Date.parse(deferred.at) < 60 * 60_000) {
            state.deferred = undefined;
            ctx.fns.screen.open({ ...deferred.opts, tabId }).catch(() => { state.deferred ??= deferred; });
        } else if (deferred && Date.now() - Date.parse(deferred.at) >= 60 * 60_000) state.deferred = undefined;
    }
    return new Response(null, { status: 204 });
}
