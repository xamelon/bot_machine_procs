export default async function (ctx: Context, _session: Session | null, opts: { req: Request; params: { id: string } }) {
    const row = ctx.fns.procs.db.select({ sql: `SELECT v.id, f.slug, f.name FROM bot_flow_versions v JOIN bot_flows f ON f.id = v.bot_flow_id WHERE v.id = ?`, params: [opts.params.id] })[0];
    if (!row) return new Response("flow version not found", { status: 404 });
    const file = (await opts.req.formData()).get("backup");
    if (!(file instanceof File)) return new Response(null, { status: 303, headers: { location: "/bot/flows" } });
    let definition: any;
    try { definition = JSON.parse(await file.text()); }
    catch { return new Response(null, { status: 303, headers: { location: "/bot/flows" } }); }
    definition.id ??= row.slug;
    const issues = ctx.fns.bot.validate({ flow: definition });
    if (issues.length) return new Response(issues.map((issue) => issue.message).join("; "), { status: 422 });
    ctx.fns.bot.save({ name: row.name, definition });
    const saved = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_flow_versions v JOIN bot_flows f ON f.id = v.bot_flow_id WHERE f.slug = ? ORDER BY v.version DESC LIMIT 1", params: [definition.id] })[0];
    return new Response(null, { status: 303, headers: { location: `/bot/flows/${saved?.id ?? row.id}` } });
}
