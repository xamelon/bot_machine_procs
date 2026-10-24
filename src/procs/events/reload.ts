// Consumers decide how to refresh. Revision lets disconnected tabs catch up.
export default function (ctx: Context, _session: Session | null, _opts?: {}): void {
    const state = (ctx.state.procs.events ??= {});
    state.revision = (state.revision ?? 0) + 1;
    ctx.fns.procs.events.emit({ event: { type: 'reload', revision: state.revision } });
}
