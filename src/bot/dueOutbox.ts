// Only each dialog's head may be sent, including when an older row awaits retry.
export default function (ctx: Context, _session: Session | null, opts: { limit: number }) {
    const now = Date.now();
    return ctx.fns.procs.db.select({
        sql: `SELECT o.* FROM bot_outbox_messages o
            LEFT JOIN bot_platform_limits p ON p.channel = o.channel
            LEFT JOIN bot_recipient_limits r ON r.channel = o.channel AND r.external_id = o.external_id
            WHERE o.status IN ('pending', 'failed') AND (o.next_retry_at IS NULL OR o.next_retry_at <= ?)
            AND COALESCE(p.paused_until, 0) <= ? AND COALESCE(r.next_send_at, 0) <= ?
            AND NOT EXISTS (SELECT 1 FROM bot_outbox_messages older
                WHERE older.bot_channel_connection_id = o.bot_channel_connection_id AND older.external_id = o.external_id
                AND older.id < o.id AND older.status IN ('pending', 'failed'))
            ORDER BY o.id LIMIT ?`,
        params: [new Date(now).toISOString(), now, now, opts.limit],
    }).map((row: any) => ({ ...row, payload: JSON.parse(row.payload) }));
}
