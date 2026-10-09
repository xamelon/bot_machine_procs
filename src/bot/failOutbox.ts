export default function (ctx: Context, _session: Session | null, opts: { id: number; error: string; retryAfter?: number }) {
    const now = new Date();
    const at = new Date(now.getTime() + Math.max(1, opts.retryAfter ?? 5) * 1000).toISOString();
    ctx.fns.procs.db.run({
        sql: "UPDATE bot_outbox_messages SET status = 'failed', attempts = attempts + 1, last_error = ?, next_retry_at = ?, updated_at = ? WHERE id = ?",
        params: [opts.error, at, now.toISOString(), opts.id],
    });
    return { ok: true };
}
