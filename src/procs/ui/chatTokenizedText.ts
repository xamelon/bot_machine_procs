export default function (ctx: Context, _session: Session | null, opts: {
    text: string;
    tokens?: Array<{ value: string; label: string; variant?: string; icon?: string }>;
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const tokens = (opts.tokens ?? []).filter(t => t.value);
    if (!tokens.length) return `<span class="asx-chat-tokenized-text ${esc(opts.class ?? "")}">${esc(opts.text)}</span>`;
    const sorted = [...tokens].sort((a, b) => b.value.length - a.value.length);
    let html = "";
    let i = 0;
    while (i < opts.text.length) {
        const t = sorted.find(x => opts.text.startsWith(x.value, i));
        if (t) {
            html += `<span class="asx-chat-tokenized-text__token">${ctx.fns.procs.ui.badge({ label: t.label, variant: t.variant as any, icon: t.icon })}</span>`;
            i += t.value.length;
        } else {
            html += esc(opts.text[i]);
            i += 1;
        }
    }
    return `<span class="asx-chat-tokenized-text ${esc(opts.class ?? "")}">${html}</span>`;
}
