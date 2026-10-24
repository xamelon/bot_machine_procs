// Which flows a channel connection serves. The reverse of flowChannels: a
// trigger fires only where the flow is linked, so this is what the Channels page
// has to show for every connection.
export default function (ctx: Context, _session: Session | null, opts: { connectionId: number }) {
    const linked = new Set(ctx.fns.procs.db.select({
        sql: "SELECT bot_flow_id FROM bot_flow_connections WHERE bot_channel_connection_id = ? AND enabled = 1",
        params: [opts.connectionId],
    }).map((row: any) => Number(row.bot_flow_id)));
    return ctx.fns.procs.db.select({
        sql: "SELECT id, slug, name, status FROM bot_flows ORDER BY name",
    }).map((row: any) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
        linked: linked.has(Number(row.id)),
    }));
}
