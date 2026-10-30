export default function (ctx: Context, _session: Session | null) {
    const config = ctx.fns.procs.config.resolve({ module: "bot" });
    (ctx.state.bot ??= {}).workersEnabled = true;
    const inbox = setInterval(() => ctx.fns.bot.wake({ queue: 'inbox' }), config.pollMs);
    const outbox = setInterval(() => ctx.fns.bot.wake({ queue: 'outbox' }), config.pollMs);
    ctx.fns.bot.wake({ queue: 'inbox' });
    ctx.fns.bot.wake({ queue: 'outbox' });
    return { inboxTimer: inbox, outboxTimer: outbox };
}
