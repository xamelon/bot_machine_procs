// Server delays win; repeated limits without a delay back off, independently for each platform.
export default function (ctx: Context, _session: Session | null, opts: { channel: string; retryAfter?: number }) {
    const now = Date.now();
    const config = ctx.fns.procs.config.resolve({ module: 'bot' });
    return ctx.fns.procs.db.conn().transaction(() => {
        const previous = ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_platform_limits WHERE channel = ?', params: [opts.channel] })[0];
        const base = Math.max(1, config.rateLimitBackoffSeconds);
        const maximum = Math.max(base, config.rateLimitMaxBackoffSeconds);
        const backoff = previous && now - previous.last_limit_at < 600_000 ? Math.min(maximum, Math.max(base, previous.backoff_seconds * 2)) : base;
        const seconds = Number.isFinite(opts.retryAfter) && opts.retryAfter! >= 0 ? Math.max(1, opts.retryAfter!) : backoff;
        const until = Math.max(previous?.paused_until ?? 0, now + Math.ceil(seconds * 1000));
        ctx.fns.procs.db.run({
            sql: `INSERT INTO bot_platform_limits (channel, paused_until, last_limit_at, backoff_seconds) VALUES (?, ?, ?, ?)
                ON CONFLICT(channel) DO UPDATE SET paused_until = excluded.paused_until,
                    last_limit_at = excluded.last_limit_at, backoff_seconds = excluded.backoff_seconds`,
            params: [opts.channel, until, now, backoff],
        });
        return Math.ceil((until - now) / 1000);
    })();
}
