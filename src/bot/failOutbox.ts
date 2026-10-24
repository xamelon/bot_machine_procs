// A send failed: schedule the next attempt (bot.retryAt), or give up — `dead`.
// `final` gives up at once: the recipient cannot be reached, retrying cannot help.
export default function (ctx: Context, _session: Session | null, opts: { id: number; error: string; retryAfter?: number; final?: boolean }) {
    const row = ctx.fns.procs.db.select({
        sql: `SELECT o.attempts, o.created_at, p.paused_until FROM bot_outbox_messages o
              LEFT JOIN bot_platform_limits p ON p.channel = o.channel WHERE o.id = ?`,
        params: [opts.id],
    })[0];
    if (!row) return { ok: false };
    const attempts = Number(row.attempts) + 1;
    const next = opts.final ? { dead: true, at: null } : ctx.fns.bot.retryAt({ attempts, createdAt: row.created_at, retryAfter: opts.retryAfter, notBefore: row.paused_until ?? 0 });
    ctx.fns.procs.db.run({
        sql: "UPDATE bot_outbox_messages SET status = ?, attempts = ?, last_error = ?, next_retry_at = ?, updated_at = ? WHERE id = ?",
        params: [next.dead ? "dead" : "failed", attempts, opts.error, next.at, new Date().toISOString(), opts.id],
    });
    return { ok: true, dead: next.dead };
}
