// List browser tabs that have volunteered their stable tabId and location. Use
// the id with screen.read/open/eval when more than one workspace tab is open.
export default function (ctx: Context, _session: Session | null, opts: { staleAfterMs?: number } = {}) {
    const staleAfterMs = opts.staleAfterMs ?? 10 * 60_000;
    const tabs = Object.values(ctx.state.screen?.tabs ?? {}).map(tab => ({
        ...tab,
        stale: Date.now() - Date.parse(tab.at) > staleAfterMs,
    }));
    return tabs.sort((a, b) => Number(b.visible) - Number(a.visible) || Date.parse(b.at) - Date.parse(a.at));
}
