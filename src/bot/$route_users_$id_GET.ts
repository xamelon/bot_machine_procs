export default function (ctx: Context, _session: Session | null, opts: { params: { id: string } }) {
    const user = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_users WHERE id = ?", params: [opts.params.id] })[0];
    if (!user) return { title: "User", status: 404, main: ctx.fns.procs.ui.empty({ title: "User not found" }) };
    const events = ctx.fns.procs.ui.table({ columns: [{ key: "event_type", label: "Event" }, { key: "node_id", label: "Node" }, { key: "created_at", label: "At" }], rows: ctx.fns.procs.db.select({ sql: "SELECT event_type, node_id, created_at FROM bot_events WHERE bot_channel_connection_id = ? ORDER BY id DESC LIMIT 50", params: [user.bot_channel_connection_id] }), empty: "No events" });
    const send = ctx.fns.procs.ui.form({ form: "send", post: `/bot/users/${user.id}/send`, class: "flex items-end gap-2", body: ctx.fns.procs.ui.field({ name: "text", placeholder: "Message" }) + ctx.fns.procs.ui.button({ action: "send", label: "Send", tone: "primary" }) });
    return ctx.fns.bot.screen({ page: "bot-user", title: user.display_name || user.external_id, lead: `${user.channel} · ${user.external_id}`, main: `${send}<div class="mt-6">${events}</div>` });
}
