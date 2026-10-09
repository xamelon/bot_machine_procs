export default function (ctx: Context, _session: Session | null) {
    const rows = ctx.fns.procs.db.select({ sql: `SELECT f.slug, f.name, f.status, v.version, v.id version_id
        FROM bot_flows f LEFT JOIN bot_flow_versions v ON v.bot_flow_id = f.id ORDER BY f.name` });
    const table = ctx.fns.procs.ui.table({
        entity: "flow", rowId: "slug",
        columns: [
            { key: "slug", label: "Slug" }, { key: "name", label: "Name" }, { key: "status", label: "Status" }, { key: "version", label: "Version" },
            { key: "version_id", label: "Flow", render: (row) => row.version_id ? `<a href="/bot/flows/${row.version_id}">edit</a> <a href="/bot/flows/${row.version_id}/backup">backup</a> <form class="inline" method="post" action="/bot/flows/${row.version_id}/restore" enctype="multipart/form-data"><label>restore<input name="backup" type="file" accept="application/json,.json" hidden onchange="this.form.submit()"></label></form>` : "" },
        ],
        rows, empty: "No flows",
    });
    return ctx.fns.bot.screen({ page: "bot-flows", title: "Flows", lead: "Published bot flows and editable versions.", main: table });
}
