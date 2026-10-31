export default function (ctx: Context, _session: Session | null, opts: {
    body: string; content?: string; name?: string; metadata?: string; mine?: boolean; variant?: "filled" | "ghost"; group?: "first" | "middle" | "last"; width?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const style = opts.width ? ` style="width:${esc(opts.width)}"` : "";
    return `<div class="asx-chat-message-bubble ${esc(opts.class ?? "")}" data-mine="${opts.mine ? "true" : "false"}" data-variant="${esc(opts.variant ?? "filled")}"${opts.group ? ` data-group="${esc(opts.group)}"` : ""}${opts.width ? ` data-has-width="true"` : ""}${style}>
        ${opts.name ? `<div class="asx-chat-message-bubble__name">${esc(opts.name)}</div>` : ""}
        <div class="asx-chat-message-bubble__body">${esc(opts.body)}</div>
        ${opts.content ?? ""}
        ${opts.metadata ?? ""}
    </div>`;
}
