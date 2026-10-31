// Read-only transcript assembled from durable queues; no duplicate message store.
export default function (ctx: Context, _session: Session | null, opts: { user: any; before?: { at: string; direction: string; id: number } }) {
    const ui = ctx.fns.procs.ui;
    const cursor = opts.before;
    const filter = cursor ? 'WHERE (created_at, direction, id) < (?, ?, ?)' : '';
    const rows = ctx.fns.procs.db.select({
        sql: `SELECT * FROM (
            SELECT id, 'in' AS direction, payload, status, last_error, created_at FROM bot_inbox_events
                WHERE bot_channel_connection_id = ? AND external_id = ?
            UNION ALL
            SELECT id, 'out' AS direction, payload, status, last_error, created_at FROM bot_outbox_messages
                WHERE bot_channel_connection_id = ? AND external_id = ?
            ) ${filter} ORDER BY created_at DESC, direction DESC, id DESC LIMIT 21`,
        params: [opts.user.bot_channel_connection_id, opts.user.external_id, opts.user.bot_channel_connection_id, opts.user.external_id, ...(cursor ? [cursor.at, cursor.direction, cursor.id] : [])],
    });
    const more = rows.length > 20;
    const messages = rows.slice(0, 20).reverse().map((row: any) => {
        let payload: any = {};
        try { payload = JSON.parse(row.payload); } catch {}
        const inbound = row.direction === 'in';
        const message = ctx.fns.bot.chatMessage({ payload, inbound, author: inbound ? opts.user.display_name || opts.user.external_id : 'Bot / operator', at: row.created_at, status: inbound ? undefined : row.status, error: inbound ? undefined : row.last_error });
        return inbound ? message : `<div data-outbox-id="${row.id}" data-outbox-status="${ui.escape({ text: row.status })}">${message}</div>`;
    }).join('');
    const oldest = rows[Math.min(20, rows.length) - 1];
    const next = more && oldest ? JSON.stringify({ at: oldest.created_at, direction: oldest.direction, id: oldest.id }) : '';
    const composer = opts.before ? '' : ui.form({ form: 'user-chat-send', action: `/bot/users/${opts.user.id}/send`, body: ui.grid({ columns: 'minmax(0, 1fr) auto', gap: 2, body: ui.input({ name: 'text', placeholder: 'Write a message', required: true, ariaLabel: 'Message' }) + ui.button({ label: 'Send', type: 'submit', variant: 'primary' }) }) });
    return `<div data-user-chat data-history-url="/bot/users/${opts.user.id}/history" data-before="${ui.escape({ text: next })}"><div data-chat-loading role="status"></div><div data-chat-scroll>${ui.chatMessageList({ body: messages, align: 'top', emptyState: ui.emptyState({ title: 'No messages yet' }) })}</div>${composer}</div>`;
}
