export default function (ctx: Context, _session: Session | null) {
    const config = ctx.fns.procs.config.resolve({ module: "bot" });
    const inbox = setInterval(() => {
        ctx.fns.bot.processInbox({ limit: config.processLimit }).catch((error: any) => {
            if (!String(error?.message ?? error).includes("already running")) ctx.fns.procs.log.error({ event: "bot.inbox", msg: String(error?.message ?? error) });
        });
    }, config.pollMs);
    const outbox = setInterval(() => {
        ctx.fns.bot.sendOutbox({ limit: config.sendLimit }).catch((error: any) => {
            if (!String(error?.message ?? error).includes("already running")) ctx.fns.procs.log.error({ event: "bot.outbox", msg: String(error?.message ?? error) });
        });
    }, config.pollMs);
    return { inboxTimer: inbox, outboxTimer: outbox };
}
