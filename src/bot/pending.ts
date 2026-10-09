// Outbox rows a channel adapter should send. Sending itself is not here.
export default function (ctx: Context, _session: Session | null, opts?: { limit?: number }) {
    const now = new Date().toISOString();
    return ctx.fns.procs.db.select({
        sql: `SELECT * FROM bot_outbox_messages
              WHERE status IN ('pending', 'failed') AND (next_retry_at IS NULL OR next_retry_at <= ?)
              ORDER BY id ASC LIMIT ?`,
        params: [now, opts?.limit ?? 50],
    }).map((row: any) => ({ ...row, payload: JSON.parse(row.payload) }));
}
