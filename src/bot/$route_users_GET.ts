export default function (ctx: Context, session: Session | null) {
    const filters = ctx.fns.bot.filterBar({ subject: "users", href: "/bot/users" });
    const rows = filters.applied.ok ? ctx.fns.procs.db.select({
        sql: `SELECT id, channel, external_id, display_name, created_at FROM bot_users u WHERE ${filters.applied.where} ORDER BY u.id DESC LIMIT 200`,
        params: filters.applied.params,
    }) : [];
    const table = ctx.fns.procs.ui.table({
        entity: "user", rowHref: (row) => `/bot/users/${row.id}`,
        columns: [{ key: "display_name", label: "Name" }, { key: "channel", label: "Channel" }, { key: "external_id", label: "External id" }, { key: "created_at", label: "Created" }],
        rows, empty: "No users",
    });
    return ctx.fns.bot.screen({
        page: "bot-users",
        title: "Users",
        lead: "People the bot has seen.",
        main: `${filters.error ? ctx.fns.procs.ui.banner({ tone: "error", body: filters.error }) : ""}${filters.bar}${ctx.fns.procs.ui.card({ body: table })}`,
    });
}
