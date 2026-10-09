export default function (ctx: Context, session: Session | null) {
    const c = ctx.fns.procs.db.select({ sql: `SELECT
        (SELECT count(*) FROM bot_users) users,
        (SELECT count(*) FROM bot_sessions) sessions,
        (SELECT count(*) FROM bot_inbox_events) inbox,
        (SELECT count(*) FROM bot_inbox_events WHERE status = 'pending') inbox_pending,
        (SELECT count(*) FROM bot_inbox_events WHERE status = 'failed') inbox_failed,
        (SELECT count(*) FROM bot_outbox_messages) outbox,
        (SELECT count(*) FROM bot_outbox_messages WHERE status = 'pending') outbox_pending,
        (SELECT count(*) FROM bot_outbox_messages WHERE status = 'failed') outbox_failed,
        (SELECT count(*) FROM bot_events) events,
        (SELECT count(*) FROM bot_flows) flows,
        (SELECT count(*) FROM bot_triggers) triggers` })[0];
    const stats = ctx.fns.procs.ui.stats({ items: [
        { label: "Users", value: c.users }, { label: "Sessions", value: c.sessions },
        { label: "Inbox", value: c.inbox }, { label: "Outbox", value: c.outbox },
        { label: "Events", value: c.events }, { label: "Flows", value: c.flows }, { label: "Triggers", value: c.triggers },
    ] });
    const health = ctx.fns.procs.ui.table({ columns: [
        { key: "queue", label: "Queue" }, { key: "pending", label: "Pending" }, { key: "failed", label: "Failed" },
        { key: "status", label: "Status", render: (row) => ctx.fns.procs.ui.badge({ text: row.status, tone: row.status === "failed" ? "danger" : "success" }) },
    ], rows: [
        { id: "inbox", queue: "Inbox", pending: c.inbox_pending, failed: c.inbox_failed, status: c.inbox_failed ? "failed" : "ok" },
        { id: "outbox", queue: "Outbox", pending: c.outbox_pending, failed: c.outbox_failed, status: c.outbox_failed ? "failed" : "ok" },
    ] });
    return ctx.fns.bot.screen({ page: "bot", title: "Bot", lead: "Runtime state, queues, and setup shortcuts.", main: `${stats}<div class="mt-6">${ctx.fns.procs.ui.box({ title: "Runtime health", body: health })}</div>` });
}
