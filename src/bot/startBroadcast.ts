// One transaction makes confirmation idempotent and only releases the frozen draft audience.
export default function (ctx: Context, _session: Session | null, opts: { id: number }) {
    return ctx.fns.procs.db.conn().transaction(() => {
        const row = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_broadcasts WHERE id = ?", params: [opts.id] })[0];
        if (!row) throw new Error("Broadcast not found");
        if (row.status !== "draft") return { id: row.id, started: false };
        const connection = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE id = ? AND status = 'active'", params: [row.bot_channel_connection_id] })[0];
        if (!connection) throw new Error("Channel connection is not active");
        const now = new Date().toISOString();
        ctx.fns.procs.db.run({
            sql: `UPDATE bot_outbox_messages SET status = CASE WHEN EXISTS (
                    SELECT 1 FROM bot_users u WHERE u.bot_channel_connection_id = bot_outbox_messages.bot_channel_connection_id
                    AND u.external_id = bot_outbox_messages.external_id AND u.blocked_at IS NULL
                ) THEN 'pending' ELSE 'cancelled' END, updated_at = ? WHERE bot_broadcast_id = ? AND status = 'draft'`,
            params: [now, row.id],
        });
        ctx.fns.procs.db.run({ sql: "UPDATE bot_broadcasts SET status = 'queued', started_at = ? WHERE id = ?", params: [now, row.id] });
        return { id: row.id, started: true };
    })();
}
