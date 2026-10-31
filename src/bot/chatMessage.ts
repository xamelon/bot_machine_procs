// Shared transcript renderer. Only sandbox supplies an action for callback buttons.
export default function (ctx: Context, _session: Session | null, opts: {
    payload: any; inbound: boolean; author: string; at: string; status?: string; error?: string;
    sandboxRecipient?: string; perspective?: 'operator' | 'participant';
}) {
    const ui = ctx.fns.procs.ui;
    const esc = (text: any) => ui.escape({ text });
    const payload = opts.payload ?? {};
    const mine = opts.perspective === 'participant' ? opts.inbound : !opts.inbound;
    const safeUrl = (url: any) => typeof url === 'string' && (/^https?:\/\//i.test(url) || /^\/uploads\/bot\//.test(url));
    const clicked = opts.inbound && payload.payload != null;
    const label = payload.text || (typeof payload.payload === 'string' ? payload.payload : JSON.stringify(payload.payload));
    const lines = [clicked ? `Нажал кнопку «${label}»` : payload.text];
    if (!payload.text && payload.payload == null && payload.kind) lines.push(`Event: ${payload.kind}`);
    if (opts.error) lines.push(`Error: ${opts.error}`);
    const attachments = (Array.isArray(payload.attachments) ? payload.attachments : []).map((item: any) => {
        const label = `Attachment: ${item?.type ?? 'file'}`;
        if (safeUrl(item?.url)) {
            const preview = item.type === 'photo' ? `<img src="${esc(item.url)}" alt="Attached photo" loading="lazy" referrerpolicy="no-referrer" style="max-width:100%;max-height:320px;object-fit:contain">` : '';
            return preview + ui.link({ href: item.url, label, external: true });
        }
        return esc(`${label}${item?.ref ? ` (${item.ref})` : ''}`);
    }).join('');
    const rows = Array.isArray(payload.button_rows) ? payload.button_rows : Array.isArray(payload.buttons) ? [payload.buttons] : [];
    const keyboard = rows.filter(Array.isArray).map((row: any[]) => ui.grid({ columns: `repeat(${Math.max(1, row.length)}, minmax(0, 1fr))`, gap: 2, body: row.map(button => {
        if (!button || typeof button.label !== 'string') return '';
        if (safeUrl(button.url)) return ui.link({ href: button.url, label: button.label, external: true });
        return ui.button({ label: button.label, size: 'sm', variant: 'primary', disabled: opts.sandboxRecipient === undefined,
            ...(opts.sandboxRecipient !== undefined ? { post: '/bot/sandbox', vals: { external_id: opts.sandboxRecipient, text: button.label, payload: String(button.payload || button.label) } } : {}) });
    }).join('') })).join('');
    const metadata = `<div class="asx-chat-message-metadata">${esc(opts.author)} · ${ctx.fns.bot.date({ value: opts.at })}${opts.status ? ` · <span data-message-status>${esc(opts.status)}</span>` : ''}</div>`;
    const extra = attachments + (keyboard ? ui.stack({ body: (payload.keyboard_mode === 'reply' ? '<small>Reply keyboard</small>' : '') + keyboard, gap: 2 }) : '');
    const bubble = ui.chatMessageBubble({ body: lines.filter(Boolean).join('\n') || (!attachments && !keyboard ? 'Empty message' : ''), content: extra ? ui.stack({ body: extra, gap: 2 }) : '', mine, variant: mine ? 'filled' : 'ghost' });
    return ui.chatMessage({ sender: mine ? 'user' : 'assistant', avatar: 'none', children: bubble + metadata });
}
