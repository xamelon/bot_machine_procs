export default function (ctx: Context, session: Session | null) {
    const paging = ctx.fns.bot.listPage({ from: 'bot_users', href: '/bot/chats' });
    const rows = ctx.fns.procs.db.select({ sql: "SELECT id, channel, external_id, display_name FROM bot_users ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?", params: [paging.size, paging.offset] });
    return ctx.fns.bot.screen({ page: "bot-chats", title: "Chats", lead: "Recent bot users, newest first.", main: ctx.fns.procs.ui.card({ body: ctx.fns.procs.ui.table({ entity: "chat", rowHref: (row) => `/bot/users/${row.id}`, columns: [{ key: "display_name", label: "Name" }, { key: "channel", label: "Channel", render: (row) => ctx.fns.procs.ui.platform({ platform: row.channel }) }, { key: "external_id", label: "External id" }], rows, empty: "No chats" }) + paging.pager }) });
}
