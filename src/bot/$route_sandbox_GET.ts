export default function (ctx: Context, _session: Session | null) {
    const echo = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = 'conn_echo'" })[0];
    const session = echo && ctx.fns.procs.db.select({ sql: "SELECT current_node_id, context, completed_at FROM bot_sessions WHERE bot_channel_connection_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1", params: [echo.id] })[0];
    const rows = echo ? ctx.fns.procs.db.select({ sql: `SELECT * FROM (
        SELECT 'in' AS direction, id, payload, status, created_at, external_id FROM bot_inbox_events WHERE bot_channel_connection_id = ?
        UNION ALL SELECT 'out' AS direction, id, payload, status, created_at, external_id FROM bot_outbox_messages WHERE bot_channel_connection_id = ?
        ) ORDER BY created_at DESC, direction DESC, id DESC LIMIT 20`, params: [echo.id, echo.id] }) : [];
    const thread = ctx.fns.procs.ui.chatMessageList({ align: 'top', body: rows.reverse().map((row: any) => ctx.fns.bot.chatMessage({ perspective: 'participant', payload: JSON.parse(row.payload), inbound: row.direction === 'in', author: row.direction === 'in' ? row.external_id : 'Bot', at: row.created_at, status: row.direction === 'out' ? row.status : undefined, sandboxRecipient: row.direction === 'out' ? row.external_id : undefined })).join(''), emptyState: ctx.fns.procs.ui.emptyState({ title: 'Диалог пуст', body: 'Напиши /start, чтобы запустить flow.' }) });
    const state = ctx.fns.procs.ui.codeBlock({ code: JSON.stringify(session ? { node: session.current_node_id, context: JSON.parse(session.context || '{}') } : {}, null, 2) });
    const settings = ctx.fns.procs.ui.collapsible({ title: 'Настройки тестирования', body: ctx.fns.procs.ui.stack({ gap: 4, body: ctx.fns.bot.input({ name: 'external_id', label: 'ID тестового пользователя', value: 'sandbox', placeholder: 'sandbox' }) + state }) });
    const controls = ctx.fns.procs.ui.grid({ columns: 'minmax(0, 1fr) auto', gap: 2, body: ctx.fns.bot.input({ name: 'text', placeholder: '/start' }) + ctx.fns.procs.ui.button({ action: 'send', label: 'Send', variant: 'primary', type: 'submit' }) });
    const form = ctx.fns.bot.form({ form: 'sandbox', post: '/bot/sandbox', body: settings + controls });
    const chat = ctx.fns.procs.ui.chatLayout({ body: thread, composer: form, class: 'bot-sandbox-chat' });
    const reset = ctx.fns.procs.ui.button({ action: "reset", label: "Reset", post: "/bot/sandbox/reset" });
    return ctx.fns.bot.screen({ page: "bot-sandbox", title: "Sandbox", lead: "Talk to the echo flow without a channel.", right: reset, main: `${ctx.fns.procs.ui.card({ body: chat, class: 'bot-sandbox-thread' })}<script src="/bot/sandbox.js" defer></script>` });
}
