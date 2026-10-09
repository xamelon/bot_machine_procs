export default function (_ctx: Context, _session: Session | null, state?: any) {
    if (state?.inboxTimer) clearInterval(state.inboxTimer);
    if (state?.outboxTimer) clearInterval(state.outboxTimer);
}
