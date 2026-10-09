// The other half. Runs in reverse order on shutdown, with the state $start
// returned.
export default function (ctx: Context, state: any) {
    ctx.state.notes = { ...state, stopped: true };
}
