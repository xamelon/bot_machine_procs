// Operator's "Retry": a waiting or given-up message goes out on the next send tick.
// Its age is unchanged, so a message older than retryGiveUpHours gets this one
// attempt and is `dead` again if it fails.
export default function (ctx: Context, _session: Session | null, opts: { params: { id: string } }) {
    ctx.fns.procs.db.run({
        sql: "UPDATE bot_outbox_messages SET status = 'pending', next_retry_at = NULL, updated_at = ? WHERE id = ? AND status IN ('failed', 'dead')",
        params: [new Date().toISOString(), Number(opts.params.id)],
    });
    return new Response(null, { status: 303, headers: { location: "/bot/outbox" } });
}
