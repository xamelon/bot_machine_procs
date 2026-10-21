export default function (ctx: Context, _session: Session | null) {
    const filters = ctx.fns.bot.filterBar({ subject: "outbox", href: "/bot/outbox" });
    const rows = filters.applied.ok ? ctx.fns.procs.db.select({
        sql: `SELECT id, channel, external_id, status, attempts, last_error, created_at FROM bot_outbox_messages m WHERE ${filters.applied.where} ORDER BY m.id DESC LIMIT 200`,
        params: filters.applied.params,
    }) : [];
    return ctx.fns.bot.screen({ page: "bot-outbox", title: "Outbox", lead: "Messages waiting to be delivered.", main: `${filters.error ? ctx.fns.procs.ui.banner({ tone: "error", body: filters.error }) : ""}${filters.bar}${ctx.fns.procs.ui.card({ body: ctx.fns.procs.ui.table({ columns: [{ key: "id", label: "Id" }, { key: "channel", label: "Channel" }, { key: "external_id", label: "User" }, { key: "status", label: "Status" }, { key: "attempts", label: "Attempts" }, { key: "last_error", label: "Error", wrap: true }], rows, empty: "Outbox is empty" }) })}` });
}
