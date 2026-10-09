export default function (ctx: Context, _session: Session | null) {
    const rows = ctx.fns.procs.db.select({ sql: "SELECT id, channel, external_id, display_name, created_at FROM bot_users ORDER BY id DESC LIMIT 200" });
    return ctx.fns.bot.screen({ page: "bot-users", title: "Users", main: ctx.fns.procs.ui.table({
        entity: "user", rowHref: (row) => `/bot/users/${row.id}`,
        columns: [{ key: "display_name", label: "Name" }, { key: "channel", label: "Channel" }, { key: "external_id", label: "External id" }, { key: "created_at", label: "Created" }],
        rows, empty: "No users",
    }) });
}
