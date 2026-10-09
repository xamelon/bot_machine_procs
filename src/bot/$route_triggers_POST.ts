export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const form = await opts.req.formData();
    const slug = String(form.get("flow") ?? "");
    const flow = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_flows WHERE slug = ?", params: [slug] })[0];
    if (!flow) return { status: 422, title: "Triggers", main: ctx.fns.procs.ui.notice({ tone: "danger", text: "Unknown flow" }) };
    const type = String(form.get("type") ?? "command");
    const command = String(form.get("command") ?? "");
    const now = new Date().toISOString();
    ctx.fns.procs.db.insert({ into: "bot_triggers", values: {
        bot_flow_id: flow.id, name: String(form.get("name") ?? type), channel: String(form.get("channel") ?? "*"), type,
        match: JSON.stringify(type === "command" ? { command } : { text: command }),
        start_node_id: String(form.get("start_node_id") ?? ""), session_mode: "start_or_jump", priority: 0, enabled: 1, created_at: now, updated_at: now,
    } });
    return new Response(null, { status: 303, headers: { location: "/bot/triggers" } });
}
