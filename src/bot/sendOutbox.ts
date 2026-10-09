// Send due outbox rows through bot.adapter.<channel>.send.
// ponytail: one-process guard only. Multi-process sending needs DB leases.
export default async function (ctx: Context, _session: Session | null, opts?: { limit?: number }) {
    const state = (ctx.state.bot ??= {});
    if (state.sending) throw new Error("outbox sending already running");
    state.sending = true;
    let sent = 0, failed = 0, skipped = 0;
    try {
        for (const message of ctx.fns.bot.pending({ limit: opts?.limit ?? 20 })) {
            const row = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_channel_connections WHERE id = ?", params: [message.bot_channel_connection_id] })[0];
            const connection = row ? { ...row, credentials: JSON.parse(row.credentials || "{}"), config: JSON.parse(row.config || "{}") } : null;
            const result = await ctx.fns.procs.hooks.first({ name: `bot.adapter.${message.channel}`, opts: { phase: "send", message, connection } });
            if (!result) { skipped++; ctx.fns.bot.failOutbox({ id: message.id, error: `unknown channel ${message.channel}`, retryAfter: 60 }); continue; }
            if (result.ok === false) { failed++; ctx.fns.bot.failOutbox({ id: message.id, error: String(result.error ?? "send failed"), retryAfter: result.retryAfter }); continue; }
            ctx.fns.bot.ack({ id: message.id, externalMessageId: result.externalMessageId });
            sent++;
        }
        return { sent, failed, skipped };
    } finally {
        state.sending = false;
    }
}
