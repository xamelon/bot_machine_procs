export default function (ctx: Context, _session: Session | null, opts: {
    name?: string; value?: string; placeholder?: string; disabled?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<textarea class="asx-chat-composer-input ${esc(opts.class ?? "")}" data-asx-chat-input name="${esc(opts.name ?? "message")}" placeholder="${esc(opts.placeholder ?? "Message…")}" rows="1"${opts.disabled ? " disabled" : ""}>${esc(opts.value ?? "")}</textarea>`;
}
