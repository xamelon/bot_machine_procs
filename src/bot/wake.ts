// Coalesced in-process wakeups. Database rows remain the durable source of work.
// Defer execution until the caller's synchronous transaction has committed.
export default function (ctx: Context, _session: Session | null, opts: { queue: 'inbox' | 'outbox' }) {
    const state = (ctx.state.bot ??= {});
    if (!state.workersEnabled) return;
    const workers = (state.workers ??= {});
    const worker = (workers[opts.queue] ??= { dirty: false, running: false });
    worker.dirty = true;
    if (worker.running || worker.timer) return;
    worker.timer = setTimeout(async () => {
        worker.timer = undefined;
        if (!state.workersEnabled) return;
        // Explicit/manual drains share the same processing guards.
        if (opts.queue === 'inbox' ? state.processing : state.sending) {
            ctx.fns.bot.wake(opts);
            return;
        }
        worker.running = true;
        worker.dirty = false;
        try {
            const config = ctx.fns.procs.config.resolve({ module: 'bot' });
            if (opts.queue === 'inbox') {
                const result = await ctx.fns.bot.processInbox({ limit: config.processLimit });
                if (result.more) worker.dirty = true;
            } else {
                const result = await ctx.fns.bot.sendOutbox({ limit: config.sendLimit });
                if (result.sent + result.failed + result.skipped >= config.sendLimit) worker.dirty = true;
            }
        } catch (error: any) {
            ctx.fns.procs.log.error({ event: `bot.${opts.queue}`, msg: String(error?.message ?? error) });
        } finally {
            worker.running = false;
            if (worker.dirty && state.workersEnabled) ctx.fns.bot.wake(opts);
        }
    }, (opts.queue === 'inbox' ? state.processing : state.sending) ? 25 : 0);
}
