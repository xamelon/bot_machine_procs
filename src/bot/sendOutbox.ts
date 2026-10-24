// Send due outbox rows through bot.adapter.<channel>.send.
// ponytail: one-process guard only. Multi-process sending needs DB leases.
export default async function (ctx: Context, _session: Session | null, opts?: { limit?: number }) {
    const state = (ctx.state.bot ??= {});
    if (state.sending) throw new Error("outbox sending already running");
    state.sending = true;
    let sent = 0, failed = 0, skipped = 0;
    try {
        for (let i = 0; i < (opts?.limit ?? 20); i++) {
            // Re-select after each attempt: a new platform/recipient pause must apply to the next row.
            const message = ctx.fns.bot.pending({ limit: 1 })[0];
            if (!message) break;
            try {
                const row = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_channel_connections WHERE id = ?", params: [message.bot_channel_connection_id] })[0];
                const connection = row ? { ...row, credentials: JSON.parse(row.credentials || "{}"), config: JSON.parse(row.config || "{}") } : null;
                const payload = connection ? await ctx.fns.bot.prepareMedia({ connection, payload: message.payload }) : message.payload;
                const result = await ctx.fns.procs.hooks.first({ name: `bot.adapter.${message.channel}`, opts: { phase: "send", message: { ...message, payload }, connection } });
                if (!result) { skipped++; ctx.fns.bot.failOutbox({ id: message.id, error: `unknown channel ${message.channel}`, retryAfter: 60 }); continue; }
                if (result.ok === false) {
                    failed++;
                    // `unreachable`: the person blocked the bot or cannot be written to — no retry.
                    if (result.unreachable && connection) ctx.fns.bot.blockUser({ connectionId: connection.id, externalId: message.external_id });
                    ctx.fns.bot.failOutbox({ id: message.id, error: String(result.error ?? "send failed"), retryAfter: result.retryAfter, final: !!result.unreachable });
                    continue;
                }
                if (connection && result.fileIds) ctx.fns.bot.rememberMedia({ connectionId: connection.id, payload: message.payload, refs: result.fileIds });
                ctx.fns.bot.ack({ id: message.id, externalMessageId: result.externalMessageId });
                sent++;
            } catch (error: any) {
                failed++;
                ctx.fns.bot.failOutbox({ id: message.id, error: String(error?.message ?? error), retryAfter: error?.retryAfter });
            }
        }
        return { sent, failed, skipped };
    } finally {
        state.sending = false;
    }
}
