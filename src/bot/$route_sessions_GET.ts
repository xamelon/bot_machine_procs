export default function (ctx: Context, _session: Session | null) {
    const filters = ctx.fns.bot.filterBar({ subject: "sessions", href: "/bot/sessions" });
    const rows = filters.applied.ok ? ctx.fns.procs.db.select({
        sql: `SELECT id, flow_id, current_node_id, flow_version, completed_at, updated_at FROM bot_sessions s WHERE ${filters.applied.where} ORDER BY s.id DESC LIMIT 200`,
        params: filters.applied.params,
    }) : [];
    return ctx.fns.bot.screen({ page: "bot-sessions", title: "Sessions", lead: "Active and completed flow runs.", main: `${filters.error ? ctx.fns.procs.ui.banner({ tone: "error", body: filters.error }) : ""}${filters.bar}${ctx.fns.procs.ui.card({ body: ctx.fns.procs.ui.table({ columns: [{ key: "id", label: "Id" }, { key: "flow_id", label: "Flow" }, { key: "current_node_id", label: "Node" }, { key: "flow_version", label: "Version" }, { key: "completed_at", label: "Completed" }], rows, empty: "No sessions" }) })}` });
}
