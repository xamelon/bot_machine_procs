// Inject JS into the open workspace page and wait for its result. The code is
// the body of an async function in the tab; the last expression is returned.
//
// The event only reaches tabs that are subscribed *now* — a page that has just
// loaded has not finished connecting its event stream, and firing into that gap
// looks exactly like "no browser is open". So wait for a listener first, and
// send again once if the first attempt goes unanswered: a tab that reconnects
// mid-flight (the stream retries with a backoff) would otherwise miss its only
// chance.
export default async function (ctx: Context, _session: Session | null, opts: { code: string; timeoutMs?: number; tabId?: string }) {
    const page = (ctx.state.screen ??= { nextId: 1, pending: new Map() });
    const id = page.nextId++;
    const timeout = opts.timeoutMs ?? 10_000;
    const deadline = Date.now() + timeout;
    const target = chooseTab(page, opts.tabId);
    if (!target) throw new Error(opts.tabId ? `screen tab ${JSON.stringify(opts.tabId)} is not active` : "no visible workspace tab — the person is elsewhere; do not wait for them: say it in words (screen.open queues the page for when they are back)");
    const tabId = target.tabId;
    const connectionId = target.connectionId;
    // Listener discovery is part of the caller's timeout budget, not an extra
    // three seconds on top. In particular screen.open({}) promises to fail in
    // at most two seconds even when no browser tab is connected.
    for (let waited = 0; !listeners(ctx) && waited < Math.min(3_000, timeout); waited += 50) await Bun.sleep(50);
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error(listeners(ctx) ? `the page did not answer in ${timeout}ms` : "no page answered — is the workspace UI open in a browser?");
    const answer = new Promise((resolve, reject) => {
        page.pending.set(id, { resolve, reject, tabId, connectionId });
        setTimeout(() => {
            if (page.pending.has(id)) ctx.fns.procs.events.emit({ event: { type: "eval", id, code: opts.code, tabId, connectionId, expiresAt: deadline } });
        }, Math.min(1_500, remaining / 3));
        setTimeout(() => {
            if (!page.pending.delete(id)) return;
            reject(new Error(listeners(ctx) ? `the page did not answer in ${timeout}ms` : "no page answered — is the workspace UI open in a browser?"));
        }, remaining);
    });

    ctx.fns.procs.events.emit({ event: { type: "eval", id, code: opts.code, tabId, connectionId, expiresAt: deadline } });
    return answer;
}


function chooseTab(page: any, requested?: string): any {
    const now = Date.now();
    const tabs = Object.values(page.tabs ?? {}).filter((tab: any) =>
        tab.visible && tab.lifecycle !== "closed" && tab.lifecycle !== "frozen" && now - Date.parse(tab.at) < 10 * 60_000);
    if (requested) return tabs.find((tab: any) => tab.tabId === requested) ?? null;
    return tabs.sort((a: any, b: any) =>
        Number(b.focused) - Number(a.focused)
        || b.lastInteractionAt - a.lastInteractionAt
        || Date.parse(b.at) - Date.parse(a.at))[0] ?? null;
}
function listeners(ctx: Context): number {
    return ctx.state.procs.events?.subs?.size ?? 0;
}
