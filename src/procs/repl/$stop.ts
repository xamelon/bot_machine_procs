// Cancel token renewal on lifecycle shutdown.
export default function (ctx: Context, _session: Session | null, _opts?: {}) {
    const state = ctx.state.procs?.repl;
    if (state?.renewalTimer) clearTimeout(state.renewalTimer);
    if (state) state.renewalTimer = undefined;
}
