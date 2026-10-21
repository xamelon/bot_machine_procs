export default function (ctx: Context, session: Session | null, opts?: { previewId?: number; error?: string; values?: { connectionId?: string; text?: string; tree?: any; q?: string } }) {
    const ui = ctx.fns.procs.ui;
    const esc = (text: any) => ui.escape({ text });
    const values = opts?.values ?? {};
    const connections = ctx.fns.procs.db.select({ sql: "SELECT id, name, channel FROM bot_channel_connections WHERE status = 'active' ORDER BY id" });
    const filters = Array.isArray(values.tree?.all) ? values.tree.all.filter((item: any) => item?.filter).map((item: any) => ({ field: item.filter, operator: item.op, value: item.value })) : [];
    const form = `<form method="post" action="/bot/broadcasts/new" class="asx-form grid gap-3">
        ${ui.selector({ name: "connection_id", label: "Channel connection", value: values.connectionId ?? String(connections[0]?.id ?? ''), required: true, items: connections.map((c: any) => ({ value: String(c.id), label: `${c.name} (${c.channel})` })) })}
        ${ui.powerSearch({ name: "filters", subject: "users", filters, query: values.q, label: "Audience", description: "Only unblocked users in the selected connection. No filters means all of them." })}
        ${ui.field({ label: "Message", inputID: "broadcast-text", required: true, description: "Plain text, up to 4000 characters.", control: `<textarea id="broadcast-text" name="text" class="asx-input" style="height:auto" rows="6" required maxlength="4000">${esc(values.text ?? '')}</textarea>` })}
        ${ui.button({ label: "Create draft", type: "submit", variant: "primary" })}
    </form>`;
    const preview = opts?.previewId ? ctx.fns.bot.broadcasts({ id: opts.previewId })[0] : null;
    const status = (row: any) => row.status === 'draft' ? 'Draft' : row.pending || row.failed ? 'Sending' : 'Finished';
    const details = preview ? ui.card({ title: 'Broadcast #' + preview.id, body: `
        <p>Status: <strong>${status(preview)}</strong></p>
        <p>${esc(preview.connection_name)}: ${preview.recipients} recipients in the saved audience.</p>
        <pre class="whitespace-pre-wrap break-words">${esc(preview.text)}</pre>
        ${preview.status === 'draft' ? `<p>Draft saved. Nothing will be sent until you start this broadcast. New users will not be added. Users blocked or removed since creation will be skipped.</p>
            <form method="post" action="/bot/broadcasts/${preview.id}/start"><input type="hidden" name="confirm" value="yes">${ui.button({ label: `Start broadcast (${preview.recipients} recipients)`, type: 'submit', variant: 'primary' })}</form>` : `<p>Sent: ${preview.sent}. Pending: ${preview.pending}. Errors (retrying): ${preview.failed}. Skipped: ${preview.skipped}.</p><a href="/bot/broadcasts/new?preview=${preview.id}">Refresh progress</a>`}
    ` }) : '';
    if (opts?.previewId && !preview) return new Response('Broadcast not found', { status: 404 });
    return ctx.fns.bot.screen({ page: 'bot-broadcast-new', title: preview ? 'Broadcast #' + preview.id : 'New broadcast', back: '/bot/broadcasts', backLabel: 'All broadcasts', lead: preview ? 'Review the saved broadcast and start sending when ready.' : 'Create a draft first. Nothing is sent until you start it.', main: `
        ${opts?.error ? ui.banner({ title: 'Broadcast not sent', tone: 'error', body: opts.error }) : ''}
        ${preview ? details : ui.card({ title: 'Create draft', body: connections.length ? form : ui.emptyState({ title: 'No active connections', body: 'Connect a channel first.' }) })}
    ` });
}
