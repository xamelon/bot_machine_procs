// When a failed inbox/outbox row is tried again — or that it is time to stop.
// Exponential: base·2^(attempts-1) seconds, capped at retryMaxDelaySeconds; a
// platform hint (`retryAfter`) or pause (`notBefore`, ms) can only push it later.
// A row older than retryGiveUpHours is not retried: `dead` is final until an
// operator retries it by hand.
export default function (ctx: Context, _session: Session | null, opts: { attempts: number; createdAt: string; retryAfter?: number; notBefore?: number }) {
    const config = ctx.fns.procs.config.resolve({ module: "bot" });
    const now = Date.now();
    if (now - Date.parse(opts.createdAt) >= config.retryGiveUpHours * 3_600_000) return { dead: true, at: null };
    const backoff = Math.min(config.retryMaxDelaySeconds, config.retryBaseSeconds * 2 ** Math.max(0, opts.attempts - 1));
    const hint = Number.isFinite(opts.retryAfter) ? Math.max(1, opts.retryAfter!) : 0;
    const at = Math.max(opts.notBefore ?? 0, now + Math.max(backoff, hint) * 1000);
    return { dead: false, at: new Date(at).toISOString() };
}
