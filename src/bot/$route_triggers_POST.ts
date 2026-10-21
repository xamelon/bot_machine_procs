const TYPES = ["command", "text_exact", "text_contains"];

export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const form = await opts.req.formData();
    const field = (name: string) => String(form.get(name) ?? "").trim();
    const slug = field("flow");
    const type = field("type");
    const match = field("match");
    const name = field("name");

    const flow = ctx.fns.procs.db.select({ sql: `SELECT f.id, f.slug, f.name, v.definition
        FROM bot_flows f
        LEFT JOIN bot_flow_versions v ON v.id = (SELECT id FROM bot_flow_versions WHERE bot_flow_id = f.id ORDER BY version DESC LIMIT 1)
        WHERE f.slug = ?`, params: [slug] })[0];
    if (!flow) return back(`Unknown flow: ${slug}`, "error");
    if (!TYPES.includes(type)) return back(`Unknown trigger type: ${type}`, "error");
    if (!name || !match) return back("Name and match are required.", "error");

    const definition = parse(flow.definition);
    const nodes: string[] = (definition.nodes ?? []).map((node: any) => node.id);
    const startNode = field("start_node_id") || definition.start_node_id;
    if (!startNode || !nodes.includes(startNode)) return back(`No node "${startNode}" in flow ${flow.name}.`, "error");

    const now = new Date().toISOString();
    ctx.fns.procs.db.insert({ into: "bot_triggers", values: {
        bot_flow_id: flow.id,
        name,
        channel: field("channel") || "*",
        type,
        match: JSON.stringify(type === "command" ? { command: match.replace(/^\//, "") } : { text: match }),
        start_node_id: startNode,
        session_mode: "start_or_jump",
        priority: 0,
        enabled: 1,
        created_at: now,
        updated_at: now,
    } });
    return back(`${name} created.`, "success");
}

function parse(value: any): any {
    try { return JSON.parse(value || "{}"); } catch { return {}; }
}

function back(notice: string, tone: "success" | "error") {
    return new Response(null, { status: 303, headers: { location: `/bot/triggers?notice=${encodeURIComponent(notice)}&tone=${tone}` } });
}
