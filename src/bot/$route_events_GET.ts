export default function (ctx: Context, _session: Session | null) {
    const rows = ctx.fns.procs.db.select({ sql: "SELECT id, flow_id, node_id, event_type, created_at FROM bot_events ORDER BY id DESC LIMIT 200" });
    return ctx.fns.bot.screen({ page: "bot-events", title: "Events", main: ctx.fns.procs.ui.table({ columns: [{ key: "created_at", label: "At" }, { key: "event_type", label: "Event" }, { key: "flow_id", label: "Flow" }, { key: "node_id", label: "Node" }], rows, empty: "No events" }) });
}
