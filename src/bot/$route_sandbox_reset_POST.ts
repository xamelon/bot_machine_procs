export default function (ctx: Context, _session: Session | null) {
    const echo = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = 'conn_echo'" })[0];
    if (echo) {
        ctx.fns.procs.db.run({ sql: "DELETE FROM bot_sessions WHERE bot_channel_connection_id = ?", params: [echo.id] });
        ctx.fns.procs.db.run({ sql: "DELETE FROM bot_inbox_events WHERE bot_channel_connection_id = ?", params: [echo.id] });
        ctx.fns.procs.db.run({ sql: "DELETE FROM bot_outbox_messages WHERE bot_channel_connection_id = ?", params: [echo.id] });
    }
    return new Response(null, { status: 303, headers: { location: "/bot/sandbox" } });
}
