// Structural check. Actions come from opts or from bot.action.* hooks.
export default function (ctx: Context, _session: Session | null, opts: { flow: any; actions?: string[] }) {
    const flow = opts.flow ?? {};
    const nodes: any[] = Array.isArray(flow.nodes) ? flow.nodes : [];
    const ids = new Set(nodes.map((n) => n?.id));
    const known = new Set(opts.actions ?? actionNames(ctx));
    const issues: { path: string; message: string }[] = [];

    if (flow.id == null || flow.id === "") issues.push({ path: "id", message: "flow id is required" });
    if (flow.start_node_id == null || flow.start_node_id === "") issues.push({ path: "start_node_id", message: "start node is required" });
    else if (!ids.has(flow.start_node_id)) issues.push({ path: "start_node_id", message: "missing start node" });

    if (flow.nodes != null && !Array.isArray(flow.nodes)) issues.push({ path: "nodes", message: "nodes must be an array" });
    const seen = new Set<string>();
    for (const node of nodes) {
        if (!node || typeof node !== "object") {
            issues.push({ path: "nodes", message: "node must be an object" });
            continue;
        }
        if (typeof node.id !== "string" || !node.id || seen.has(node.id)) issues.push({ path: "nodes", message: "node id must be nonempty and unique" });
        seen.add(node.id);
        if (!["message", "input", "action", "condition", "end"].includes(node.type)) issues.push({ path: `nodes.${node.id}`, message: "unknown node type" });
        if (node.type === "input" && (typeof node.input_key !== "string" || !node.input_key)) issues.push({ path: `nodes.${node.id}`, message: "input_key is required" });
        if (node?.type === "action" && !known.has(node.action)) {
            issues.push({ path: `nodes.${node.action}`, message: `unknown action ${node.action}` });
        }
        if (node?.type === "message" && Array.isArray(node.attachments)) {
            node.attachments.forEach((attachment: any, index: number) => {
                if (attachment?.type !== "photo") {
                    issues.push({ path: `nodes.${node.id}.attachments.${index}.type`, message: "only photo attachments are supported" });
                } else if (!attachment.ref && !attachment.url) {
                    issues.push({ path: `nodes.${node.id}.attachments.${index}`, message: "photo attachment requires ref or url" });
                }
            });
        }
        for (const target of targets(node)) {
            if (!ids.has(target)) issues.push({ path: `nodes.${node.id}`, message: `missing target ${target}` });
        }
    }
    return issues;
}

function actionNames(ctx: Context): string[] {
    const handlers = ctx.state.procs?.hooks?.handlers ?? {};
    return Object.keys(handlers).filter((name) => name.startsWith("bot.action.")).map((name) => name.slice("bot.action.".length));
}

function targets(node: any): string[] {
    const rows = Array.isArray(node?.button_rows) ? node.button_rows.flat() : [];
    const buttons = Array.isArray(node?.buttons) ? node.buttons : [];
    const branches = Array.isArray(node?.branches) ? node.branches : [];
    return [node?.next, node?.default, ...buttons.map((b: any) => b?.to), ...rows.map((b: any) => b?.to), ...branches.map((b: any) => b?.to)]
        .filter((t) => t != null && t !== "");
}
