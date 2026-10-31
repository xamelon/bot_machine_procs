export default function (ctx: Context, session: Session | null) {
    const filters = ctx.fns.bot.filterBar({ subject: "users", href: "/bot/users" });
    const paging = ctx.fns.bot.listPage({ from: 'bot_users u', where: filters.applied.where, params: filters.applied.params, href: '/bot/users' });
    const rows = filters.applied.ok ? ctx.fns.procs.db.select({
        sql: `SELECT id, channel, external_id, display_name, created_at FROM bot_users u WHERE ${filters.applied.where} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
        params: [...filters.applied.params, paging.size, paging.offset],
    }) : [];
    const table = ctx.fns.procs.ui.table({
        entity: "user", rowHref: (row) => `/bot/users/${row.id}`,
        columns: [{ key: "display_name", label: "Name" }, { key: "channel", label: "Channel", render: (row) => ctx.fns.procs.ui.platform({ platform: row.channel }) }, { key: "external_id", label: "External id" }, { key: "created_at", label: "Created", render: (row) => ctx.fns.bot.date({ value: row.created_at }) }],
        rows, empty: "No users",
    });
    return ctx.fns.bot.screen({
        page: "bot-users",
        title: "Users",
        lead: "People the bot has seen.",
        main: `${filters.error ? ctx.fns.procs.ui.banner({ tone: "error", body: filters.error }) : ""}${filters.bar}${ctx.fns.procs.ui.card({ body: table + paging.pager })}`,
    });
}
