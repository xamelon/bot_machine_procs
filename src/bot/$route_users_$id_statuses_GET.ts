// Small status-only refresh, scoped to this user; never transfer transcript payloads.
export default function (ctx: Context, _session: Session | null, opts: { req: Request; params: { id: string } }) {
    const user = ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_users WHERE id = ?', params: [opts.params.id] })[0];
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
    const raw = new URL(opts.req.url).searchParams.get('ids') || '';
    if (!/^\d+(,\d+)*$/.test(raw) || raw.length > 2000) return Response.json({ error: 'Invalid ids' }, { status: 400 });
    const ids = [...new Set(raw.split(',').map(Number))];
    if (ids.length > 100 || ids.some(id => !Number.isSafeInteger(id) || id < 1)) return Response.json({ error: 'Invalid ids' }, { status: 400 });
    const rows = ctx.fns.procs.db.select({ sql: `SELECT id, status, last_error FROM bot_outbox_messages
        WHERE bot_channel_connection_id = ? AND external_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
        params: [user.bot_channel_connection_id, user.external_id, ...ids] });
    return Response.json({ rows }, { headers: { 'cache-control': 'no-store' } });
}
