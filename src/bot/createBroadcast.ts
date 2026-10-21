// Draft outbox rows freeze the preview audience without making any messages sendable.
export default function (ctx: Context, _session: Session | null, opts: { connectionId: number; text: string; tree?: any; q?: string }) {
    const text = opts.text.trim();
    if (!text || text.length > 4000) throw new Error("Message must contain 1–4000 characters");
    const connection = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_channel_connections WHERE id = ? AND status = 'active'", params: [opts.connectionId] })[0];
    if (!connection) throw new Error("Choose an active channel connection");
    const tree = opts.tree === undefined ? { all: [] } : opts.tree;
    if (!tree || typeof tree !== 'object' || Array.isArray(tree)) throw new Error("Invalid audience filters");
    const applied = ctx.fns.bot.filterApply({ subject: "users", tree, q: opts.q });
    if (!applied.ok) throw new Error(applied.error);
    const now = new Date().toISOString();
    return ctx.fns.procs.db.conn().transaction(() => {
        const { id } = ctx.fns.procs.db.insert({ into: "bot_broadcasts", values: {
            bot_channel_connection_id: connection.id, text, filters: JSON.stringify(tree), query: opts.q ?? "", status: "draft", created_at: now,
        } });
        const result = ctx.fns.procs.db.run({
            sql: `INSERT INTO bot_outbox_messages
                (bot_channel_connection_id, channel, external_id, idempotency_key, payload, status, attempts, created_at, updated_at, bot_broadcast_id)
                SELECT u.bot_channel_connection_id, u.channel, u.external_id, 'broadcast:' || ? || ':' || u.id,
                    json_object('type', 'message', 'channel', u.channel, 'external_id', u.external_id, 'text', ?), 'draft', 0, ?, ?, ?
                FROM bot_users u WHERE u.bot_channel_connection_id = ? AND u.blocked_at IS NULL AND (${applied.where})`,
            params: [id, text, now, now, id, connection.id, ...applied.params],
        });
        if (!result.changes) throw new Error("No unblocked users match this audience");
        return { id, recipients: result.changes };
    })();
}
