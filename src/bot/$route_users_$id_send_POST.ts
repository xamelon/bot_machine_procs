import { randomUUID } from 'node:crypto';

export default async function (ctx: Context, _session: Session | null, opts: { req: Request; params: { id: string } }) {
    const user = ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_users WHERE id = ?', params: [opts.params.id] })[0];
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
    const form = await opts.req.formData();
    const text = String(form.get('text') ?? '');
    const requestId = String(form.get('requestId') || randomUUID());
    if (!text.trim() || text.length > 16000 || requestId.length > 100) return Response.json({ error: 'Message must contain 1–16000 characters' }, { status: 400 });
    const now = new Date().toISOString();
    ctx.fns.procs.db.run({ sql: `INSERT INTO bot_outbox_messages (bot_channel_connection_id, channel, external_id, idempotency_key, payload, status, attempts, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?) ON CONFLICT(idempotency_key) DO NOTHING`,
        params: [user.bot_channel_connection_id, user.channel, user.external_id, `admin:${user.id}:${requestId}`, JSON.stringify({ type: 'message', channel: user.channel, external_id: user.external_id, text }), now, now] });
    ctx.fns.bot.wake({ queue: 'outbox' });
    return Response.json({ html: ctx.fns.bot.userChat({ user }) }, { status: 202 });
}
