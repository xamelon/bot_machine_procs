export default function (ctx: Context, _session: Session | null) {
    const rows = ctx.fns.procs.db.select({ sql: "SELECT id, flow_id, current_node_id, flow_version, completed_at, updated_at FROM bot_sessions ORDER BY id DESC LIMIT 200" });
    return ctx.fns.bot.screen({ page: "bot-sessions", title: "Sessions", main: ctx.fns.procs.ui.table({ columns: [{ key: "id", label: "Id" }, { key: "flow_id", label: "Flow" }, { key: "current_node_id", label: "Node" }, { key: "flow_version", label: "Version" }, { key: "completed_at", label: "Completed" }], rows, empty: "No sessions" }) });
}
