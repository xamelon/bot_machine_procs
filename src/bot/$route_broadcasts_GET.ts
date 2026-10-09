export default function (ctx: Context, _session: Session | null) {
    return ctx.fns.bot.screen({ page: "bot-broadcasts", title: "Broadcasts", main: ctx.fns.procs.ui.empty({ title: "Broadcasts are not in this schema", text: "The bot_machine broadcast tables were not ported." }) });
}
