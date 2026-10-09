export default function (ctx: Context, _session: Session | null) {
    const echo = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = 'conn_echo'" })[0];
    const session = echo && ctx.fns.procs.db.select({ sql: "SELECT current_node_id, context, completed_at FROM bot_sessions WHERE bot_channel_connection_id = ? ORDER BY id DESC LIMIT 1", params: [echo.id] })[0];
    const outbox = echo ? ctx.fns.procs.db.select({ sql: "SELECT payload, status FROM bot_outbox_messages WHERE bot_channel_connection_id = ? ORDER BY id DESC LIMIT 20", params: [echo.id] }) : [];
    const thread = outbox.map((row: any) => `<p><strong>${row.status}</strong> ${ctx.fns.procs.ui.escape({ text: JSON.parse(row.payload).text ?? "" })}</p>`).join("") || ctx.fns.procs.ui.empty({ title: "Диалог пуст", text: "Напиши /start, чтобы запустить flow." });
    const form = ctx.fns.procs.ui.form({ form: "sandbox", post: "/bot/sandbox", class: "flex items-end gap-2", body: ctx.fns.procs.ui.field({ name: "external_id", value: "sandbox", placeholder: "external id" }) + ctx.fns.procs.ui.field({ name: "text", placeholder: "/start" }) + ctx.fns.procs.ui.button({ action: "send", label: "Send", tone: "primary" }) });
    const reset = ctx.fns.procs.ui.button({ action: "reset", label: "Reset", post: "/bot/sandbox/reset" });
    const state = session ? `<p>Node <code>${ctx.fns.procs.ui.escape({ text: session.current_node_id })}</code></p><pre class="mt-2 text-xs">${ctx.fns.procs.ui.escape({ text: session.context })}</pre>` : "<p>No active session.</p>";
    return ctx.fns.bot.screen({ page: "bot-sandbox", title: "Sandbox", main: `<div class="mb-4">${reset}</div><div class="grid gap-6 md:grid-cols-[16rem_1fr]"><div>${state}</div><div>${thread}<div class="mt-4">${form}</div></div></div>` });
}
