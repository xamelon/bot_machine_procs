export default function (ctx: Context, _session: Session | null) {
    const filters = ctx.fns.bot.filterBar({ subject: "events", href: "/bot/events" });
    const rows = filters.applied.ok ? ctx.fns.procs.db.select({
        sql: `SELECT id, flow_id, node_id, event_type, created_at FROM bot_events e WHERE ${filters.applied.where} ORDER BY e.id DESC LIMIT 200`,
        params: filters.applied.params,
    }) : [];
    return ctx.fns.bot.screen({ page: "bot-events", title: "Events", lead: "What the runtime recorded.", main: `${filters.error ? ctx.fns.procs.ui.banner({ tone: "error", body: filters.error }) : ""}${filters.bar}${ctx.fns.procs.ui.card({ body: ctx.fns.procs.ui.table({ columns: [{ key: "created_at", label: "At" }, { key: "event_type", label: "Event" }, { key: "flow_id", label: "Flow" }, { key: "node_id", label: "Node" }], rows, empty: "No events" }) })}` });
}
