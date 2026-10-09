export default function (ctx: Context, _session: Session | null, opts: { params: { id: string } }) {
    const row = ctx.fns.procs.db.select({ sql: `SELECT v.definition, v.version, f.slug FROM bot_flow_versions v JOIN bot_flows f ON f.id = v.bot_flow_id WHERE v.id = ?`, params: [opts.params.id] })[0];
    if (!row) return new Response("flow version not found", { status: 404 });
    return new Response(JSON.stringify(JSON.parse(row.definition), null, 2), {
        headers: { "content-type": "application/json", "content-disposition": `attachment; filename="${row.slug}-v${row.version}.json"` },
    });
}
