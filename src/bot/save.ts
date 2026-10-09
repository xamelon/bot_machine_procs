// Install or replace the current flow version. Triggers, when passed, replace that flow's triggers.
export default function (ctx: Context, _session: Session | null, opts: {
    name?: string;
    definition: any;
    status?: string;
    triggers?: any[];
    connections?: string[];
}) {
    const slug = opts.definition?.id;
    const issues = ctx.fns.bot.validate({ flow: opts.definition });
    if (issues.length) throw new Error(`invalid flow: ${JSON.stringify(issues)}`);
    for (const trigger of opts.triggers ?? []) {
        if (!opts.definition.nodes.some((node: any) => node.id === trigger.start_node_id)) throw new Error("invalid trigger start_node_id");
        if (!["restart", "start_or_jump", "notify_only"].includes(trigger.session_mode ?? "start_or_jump")) throw new Error("invalid trigger session_mode");
    }
    return ctx.fns.procs.db.conn().transaction(() => {
        const now = new Date().toISOString();
        const status = opts.status ?? "published";
        const name = opts.name ?? slug;
        const existing = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_flows WHERE slug = ?", params: [slug] })[0];
        let flowId: number;
        if (!existing) {
            flowId = Number(ctx.fns.procs.db.insert({ into: "bot_flows", values: { slug, name, status, created_at: now, updated_at: now } }).id);
        } else {
            flowId = existing.id;
            ctx.fns.procs.db.run({ sql: "UPDATE bot_flows SET name = ?, status = ?, updated_at = ? WHERE id = ?", params: [name, status, now, flowId] });
        }
        const version = ctx.fns.procs.db.select({
            sql: "SELECT id, version FROM bot_flow_versions WHERE bot_flow_id = ? ORDER BY version DESC LIMIT 1",
            params: [flowId],
        })[0];
        const definition = JSON.stringify(opts.definition);
        if (!version) {
            ctx.fns.procs.db.insert({
                into: "bot_flow_versions",
                values: { bot_flow_id: flowId, version: 1, status, definition, published_at: status === "published" ? now : null, created_at: now, updated_at: now },
            });
        } else {
            ctx.fns.procs.db.run({
                sql: "UPDATE bot_flow_versions SET status = ?, definition = ?, published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?",
                params: [status, definition, status === "published" ? now : null, now, version.id],
            });
        }
        if (opts.connections) {
            ctx.fns.procs.db.run({ sql: "DELETE FROM bot_flow_connections WHERE bot_flow_id = ?", params: [flowId] });
            for (const publicId of opts.connections) {
                const connection = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = ?", params: [publicId] })[0];
                if (!connection) throw new Error(`unknown connection ${publicId}`);
                ctx.fns.procs.db.insert({
                    into: "bot_flow_connections",
                    values: { bot_flow_id: flowId, bot_channel_connection_id: connection.id, enabled: 1, priority: 0, config: "{}", created_at: now, updated_at: now },
                });
            }
        }
        if (opts.triggers) {
            ctx.fns.procs.db.run({ sql: "DELETE FROM bot_triggers WHERE bot_flow_id = ?", params: [flowId] });
            for (const trigger of opts.triggers) {
                ctx.fns.procs.db.insert({
                    into: "bot_triggers",
                    values: {
                        bot_flow_id: flowId,
                        name: trigger.name,
                        channel: trigger.channel,
                        type: trigger.type,
                        match: JSON.stringify(trigger.match ?? {}),
                        start_node_id: trigger.start_node_id,
                        session_mode: trigger.session_mode ?? "start_or_jump",
                        priority: trigger.priority ?? 0,
                        enabled: trigger.enabled === false ? 0 : 1,
                        created_at: now,
                        updated_at: now,
                    },
                });
            }
        }
        return { id: flowId, slug };
    })();
}
