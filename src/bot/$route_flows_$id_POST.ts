export default async function (ctx: Context, _session: Session | null, opts: { req: Request; params: { id: string } }) {
    const row = ctx.fns.procs.db.select({ sql: `SELECT v.*, f.name, f.slug FROM bot_flow_versions v JOIN bot_flows f ON f.id = v.bot_flow_id WHERE v.id = ?`, params: [opts.params.id] })[0];
    if (!row) return new Response("flow version not found", { status: 404 });
    const form = await opts.req.formData();
    if (String(form.get("updated_at") ?? "") !== row.updated_at) return ctx.fns.bot.editorPage({ row, errors: ["Флоу изменился в другой вкладке — обнови страницу и повтори"] });
    let definition: any;
    try { definition = JSON.parse(String(form.get("definition") ?? "")); }
    catch (error: any) { return ctx.fns.bot.editorPage({ row, errors: [String(error?.message ?? error)] }); }
    definition.id ??= row.slug;
    const issues = ctx.fns.bot.validate({ flow: definition });
    if (issues.length) return ctx.fns.bot.editorPage({ row: { ...row, definition: JSON.stringify(definition) }, errors: issues.map((issue) => issue.message) });
    ctx.fns.bot.save({ name: row.name, definition });
    const saved = ctx.fns.procs.db.select({ sql: `SELECT id FROM bot_flow_versions v JOIN bot_flows f ON f.id = v.bot_flow_id WHERE f.slug = ? ORDER BY v.version DESC LIMIT 1`, params: [definition.id] })[0];
    return new Response(null, { status: 303, headers: { location: `/bot/flows/${saved?.id ?? row.id}` } });
}
