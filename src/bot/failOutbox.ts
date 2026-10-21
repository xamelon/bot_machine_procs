export default function (ctx: Context, _session: Session | null, opts: { id: number; error: string; retryAfter?: number }) {
    const now = new Date();
    const pause = ctx.fns.procs.db.select({
        sql: 'SELECT p.paused_until FROM bot_outbox_messages o JOIN bot_platform_limits p ON p.channel = o.channel WHERE o.id = ?',
        params: [opts.id],
    })[0]?.paused_until ?? 0;
    const delay = Number.isFinite(opts.retryAfter) ? Math.max(1, opts.retryAfter!) : 5;
    const at = new Date(Math.max(pause, now.getTime() + delay * 1000)).toISOString();
    ctx.fns.procs.db.run({
        sql: "UPDATE bot_outbox_messages SET status = 'failed', attempts = attempts + 1, last_error = ?, next_retry_at = ?, updated_at = ? WHERE id = ?",
        params: [opts.error, at, now.toISOString(), opts.id],
    });
    return { ok: true };
}
