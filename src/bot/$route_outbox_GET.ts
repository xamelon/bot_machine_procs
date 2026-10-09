export default function (ctx: Context, _session: Session | null) {
    const rows = ctx.fns.procs.db.select({ sql: "SELECT id, channel, external_id, status, attempts, last_error, created_at FROM bot_outbox_messages ORDER BY id DESC LIMIT 200" });
    return ctx.fns.bot.screen({ page: "bot-outbox", title: "Outbox", main: ctx.fns.procs.ui.table({ columns: [{ key: "id", label: "Id" }, { key: "channel", label: "Channel" }, { key: "external_id", label: "User" }, { key: "status", label: "Status" }, { key: "attempts", label: "Attempts" }, { key: "last_error", label: "Error", wrap: true }], rows, empty: "Outbox is empty" }) });
}
