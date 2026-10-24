// Which channel connections a flow answers on. A trigger only fires on a
// connection the flow is linked to (processInbox joins bot_flow_connections),
// so this is the join a person needs to see next to the flow.
export default function (ctx: Context, _session: Session | null, opts: { flowId: number }) {
    const connections = ctx.fns.procs.db.select({
        sql: "SELECT id, public_id, channel, name, status FROM bot_channel_connections ORDER BY channel, name, id",
    }).map((row: any) => ({
        id: row.id,
        publicId: row.public_id,
        channel: row.channel,
        name: row.name,
        status: row.status,
        active: row.status === "active",
    }));
    const linked = ctx.fns.procs.db.select({
        sql: `SELECT c.public_id FROM bot_flow_connections fc
              JOIN bot_channel_connections c ON c.id = fc.bot_channel_connection_id
              WHERE fc.bot_flow_id = ? AND fc.enabled = 1`,
        params: [opts.flowId],
    }).map((row: any) => row.public_id);
    // Links whose connection row is gone: they look fine in the table and match nothing.
    const dangling = Number(ctx.fns.procs.db.select({
        sql: `SELECT count(*) n FROM bot_flow_connections fc
              LEFT JOIN bot_channel_connections c ON c.id = fc.bot_channel_connection_id
              WHERE fc.bot_flow_id = ? AND c.id IS NULL`,
        params: [opts.flowId],
    })[0]?.n ?? 0);
    return { connections, linked, dangling };
}
