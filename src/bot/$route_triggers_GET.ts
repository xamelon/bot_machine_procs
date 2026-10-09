export default function (ctx: Context, _session: Session | null) {
    const rows = ctx.fns.procs.db.select({ sql: `SELECT t.id, f.slug flow, t.name, t.channel, t.type, t.start_node_id, t.session_mode, t.priority, t.enabled
        FROM bot_triggers t JOIN bot_flows f ON f.id = t.bot_flow_id ORDER BY t.priority DESC, t.id` });
    const table = ctx.fns.procs.ui.table({ columns: [
        { key: "name", label: "Name" }, { key: "flow", label: "Flow" }, { key: "channel", label: "Channel" },
        { key: "type", label: "Type" }, { key: "start_node_id", label: "Start" }, { key: "enabled", label: "On" },
        { key: "id", label: "", render: (row) => ctx.fns.procs.ui.button({ action: "delete", label: "Delete", tone: "danger", size: "xs", post: `/bot/triggers/${row.id}/delete` }) },
    ], rows, empty: "No triggers" });
    const form = ctx.fns.procs.ui.form({ form: "trigger", post: "/bot/triggers", class: "grid gap-2 md:grid-cols-3", body: [
        ctx.fns.procs.ui.field({ name: "flow", placeholder: "flow slug", required: true }),
        ctx.fns.procs.ui.field({ name: "name", placeholder: "name", required: true }),
        ctx.fns.procs.ui.field({ name: "channel", placeholder: "channel or *", value: "*" }),
        ctx.fns.procs.ui.field({ name: "type", placeholder: "command", value: "command" }),
        ctx.fns.procs.ui.field({ name: "command", placeholder: "command / text" }),
        ctx.fns.procs.ui.field({ name: "start_node_id", placeholder: "start node", required: true }),
        ctx.fns.procs.ui.button({ action: "create", label: "Create", tone: "primary" }),
    ].join("") });
    return ctx.fns.bot.screen({ page: "bot-triggers", title: "Triggers", main: `${form}<div class="mt-6">${table}</div>` });
}
