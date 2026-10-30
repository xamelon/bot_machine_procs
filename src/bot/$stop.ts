export default function (ctx: Context, _session: Session | null, state?: any) {
    const bot = ctx.state.bot;
    if (bot) {
        bot.workersEnabled = false;
        for (const worker of Object.values(bot.workers ?? {})) {
            if (worker.timer) clearTimeout(worker.timer);
            worker.timer = undefined;
            worker.dirty = false;
        }
    }
    if (state?.inboxTimer) clearInterval(state.inboxTimer);
    if (state?.outboxTimer) clearInterval(state.outboxTimer);
}
