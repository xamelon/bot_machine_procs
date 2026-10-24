// Pretty-print a stored payload column; a payload that is not JSON is shown as it is.
const rawJson = (raw: unknown) => {
    const text = String(raw ?? "");
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
};

export default function (ctx: Context, _session: Session | null) {
    const filters = ctx.fns.bot.filterBar({ subject: "outbox", href: "/bot/outbox" });
    const rows = filters.applied.ok ? ctx.fns.procs.db.select({
        sql: `SELECT id, channel, external_id, status, attempts, last_error, payload, created_at FROM bot_outbox_messages m WHERE ${filters.applied.where} ORDER BY m.id DESC LIMIT 200`,
        params: filters.applied.params,
    }) : [];
    return ctx.fns.bot.screen({ page: "bot-outbox", title: "Outbox", lead: "Messages waiting to be delivered.", main: `${filters.error ? ctx.fns.procs.ui.banner({ tone: "error", body: filters.error }) : ""}${filters.bar}${ctx.fns.procs.ui.card({ body: ctx.fns.procs.ui.table({
        columns: [{ key: "id", label: "Id" }, { key: "channel", label: "Channel", render: (row) => ctx.fns.procs.ui.platform({ platform: row.channel }) }, { key: "external_id", label: "User" }, { key: "status", label: "Status" }, { key: "attempts", label: "Attempts" }, { key: "last_error", label: "Error", wrap: true },
            // Waiting for a retry, or given up (`dead`): send it on the next tick.
            { key: "retry", label: "", render: (row) => ["failed", "dead"].includes(row.status) ? `<form method="post" action="/bot/outbox/${Number(row.id)}/retry">${ctx.fns.procs.ui.button({ label: "Retry", size: "sm", type: "submit" })}</form>` : "" }],
        rows,
        empty: "Outbox is empty",
        expandLabel: "Show raw payload",
        expand: (row) => ctx.fns.procs.ui.code({ code: rawJson(row.payload), block: true }),
    }) })}` });
}
