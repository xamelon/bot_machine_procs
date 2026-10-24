// Replace which flows this channel serves. The form names flows by slug; a bad
// slug is refused before anything is deleted, so a typo cannot empty the channel.
export default async function (ctx: Context, _session: Session | null, opts: { req: Request; params: { id: string } }) {
    const row = ctx.fns.procs.db.select({ sql: "SELECT id, name FROM bot_channel_connections WHERE id = ?", params: [opts.params.id] })[0];
    if (!row) return back("Channel not found.", "error");
    const form = await opts.req.formData();
    const slugs = [...new Set(form.getAll("flows").map(String))];
    const flowIds: number[] = [];
    for (const slug of slugs) {
        const flow = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_flows WHERE slug = ?", params: [slug] })[0];
        if (!flow) return back(`Unknown flow ${slug}.`, "error");
        flowIds.push(Number(flow.id));
    }
    ctx.fns.procs.db.conn().transaction(() => {
        const now = new Date().toISOString();
        const previous = new Map(ctx.fns.procs.db.select({
            sql: "SELECT * FROM bot_flow_connections WHERE bot_channel_connection_id = ?",
            params: [row.id],
        }).map((link: any) => [Number(link.bot_flow_id), link]));
        ctx.fns.procs.db.run({ sql: "DELETE FROM bot_flow_connections WHERE bot_channel_connection_id = ?", params: [row.id] });
        for (const flowId of flowIds) {
            const before: any = previous.get(flowId);
            ctx.fns.procs.db.insert({
                into: "bot_flow_connections",
                values: {
                    bot_flow_id: flowId,
                    bot_channel_connection_id: row.id,
                    enabled: 1,
                    priority: before?.priority ?? 0,
                    config: before?.config ?? "{}",
                    created_at: before?.created_at ?? now,
                    updated_at: now,
                },
            });
        }
    })();
    const count = flowIds.length;
    return back(`${row.name}: ${count === 0 ? "no flows" : `${count} flow${count === 1 ? "" : "s"}`}.`, "success");
}

function back(notice: string, tone: "success" | "error") {
    return new Response(null, { status: 303, headers: { location: `/bot/channels?notice=${encodeURIComponent(notice)}&tone=${tone}` } });
}
