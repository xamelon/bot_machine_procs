export default function (ctx: Context, _session: Session | null, opts?: { id?: number }) {
    return ctx.fns.procs.db.select({
        sql: `SELECT b.*, c.name AS connection_name, c.channel,
                COUNT(o.id) AS recipients,
                SUM(CASE WHEN o.status = 'sent' THEN 1 ELSE 0 END) AS sent,
                SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN o.status = 'failed' THEN 1 ELSE 0 END) AS failed,
                SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS skipped
            FROM bot_broadcasts b JOIN bot_channel_connections c ON c.id = b.bot_channel_connection_id
            LEFT JOIN bot_outbox_messages o ON o.bot_broadcast_id = b.id
            ${opts?.id === undefined ? '' : 'WHERE b.id = ?'}
            GROUP BY b.id ORDER BY b.id DESC LIMIT 100`,
        params: opts?.id === undefined ? [] : [opts.id],
    });
}
