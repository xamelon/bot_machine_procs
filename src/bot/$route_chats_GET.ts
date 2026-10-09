export default function (ctx: Context, _session: Session | null) {
    const rows = ctx.fns.procs.db.select({ sql: "SELECT id, channel, external_id, display_name FROM bot_users ORDER BY updated_at DESC LIMIT 200" });
    return ctx.fns.bot.screen({ page: "bot-chats", title: "Chats", main: ctx.fns.procs.ui.table({ entity: "chat", rowHref: (row) => `/bot/users/${row.id}`, columns: [{ key: "display_name", label: "Name" }, { key: "channel", label: "Channel" }, { key: "external_id", label: "External id" }], rows, empty: "No chats" }) });
}
