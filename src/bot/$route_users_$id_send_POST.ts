export default async function (ctx: Context, _session: Session | null, opts: { req: Request; params: { id: string } }) {
    const user = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_users WHERE id = ?", params: [opts.params.id] })[0];
    const text = String((await opts.req.formData()).get("text") ?? "");
    const now = new Date().toISOString();
    ctx.fns.procs.db.insert({ into: "bot_outbox_messages", values: { bot_channel_connection_id: user.bot_channel_connection_id, channel: user.channel, external_id: user.external_id, idempotency_key: `admin:${user.id}:${Date.now()}`, payload: JSON.stringify({ type: "message", channel: user.channel, external_id: user.external_id, text }), status: "pending", attempts: 0, created_at: now, updated_at: now } });
    return ctx.fns.bot.screen({ page: "bot-user", title: "User", main: ctx.fns.procs.ui.notice({ tone: "success", text: "Queued" }) });
}
