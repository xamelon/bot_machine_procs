// Send due outbox rows through bot.adapter.<channel>.send.
// ponytail: one-process guard only. Multi-process sending needs DB leases.
export default async function (ctx: Context, _session: Session | null, opts?: { limit?: number }) {
    const state = (ctx.state.bot ??= {});
    if (state.sending) throw new Error("outbox sending already running");
    state.sending = true;
    let sent = 0, failed = 0, skipped = 0;
    try {
        const config = ctx.fns.procs.config.resolve({ module: 'bot' });
        const limit = opts?.limit ?? config.sendLimit;
        if (!Number.isInteger(limit) || limit < 1) throw new Error('limit must be a positive integer');
        let claimed = 0;
        const busy = new Set<string>();
        const lane = async () => {
          while (claimed < limit) {
            const message = ctx.fns.bot.dueOutbox({ limit }).find((row: any) => !busy.has(`${row.bot_channel_connection_id}:${row.external_id}`));
            if (!message) return;
            const key = `${message.bot_channel_connection_id}:${message.external_id}`;
            busy.add(key); claimed++;
            const started = Date.now();
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
                    ctx.fns.bot.failOutbox({ id: message.id, error: String(result.error ?? "send failed"), retryAfter: result.retryAfter, final: !!(result.unreachable || result.permanent) });
                    continue;
                }
                if (connection && result.fileIds) ctx.fns.bot.rememberMedia({ connectionId: connection.id, payload: message.payload, refs: result.fileIds });
                ctx.fns.bot.ack({ id: message.id, externalMessageId: result.externalMessageId });
                sent++;
            } catch (error: any) {
                if (error?.rateLimited) continue; // No API request was made; preserve the row and attempts.
                failed++;
                ctx.fns.bot.failOutbox({ id: message.id, error: String(error?.message ?? error), retryAfter: error?.retryAfter });
            } finally {
                busy.delete(key);
                ctx.fns.procs.log.info({ event: 'bot.outbox.attempt', outboxId: message.id, channel: message.channel, connectionId: message.bot_channel_connection_id, queueMs: Math.max(0, started - Date.parse(message.created_at)), durationMs: Date.now() - started });
            }
        }
        };
        await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, config.outboxConcurrency)) }, lane));
        return { sent, failed, skipped };
    } finally {
        state.sending = false;
    }
}
