export default function (ctx: Context, _session: Session | null, opts: { params: { id: string } }) {
    const row = ctx.fns.procs.db.select({ sql: `SELECT v.*, f.name, f.slug FROM bot_flow_versions v JOIN bot_flows f ON f.id = v.bot_flow_id WHERE v.id = ?`, params: [opts.params.id] })[0];
    if (!row) return { title: "Flow", status: 404, main: ctx.fns.procs.ui.empty({ title: "Flow not found" }) };
    return ctx.fns.bot.editorPage({ row });
}
