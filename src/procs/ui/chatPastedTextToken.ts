export default function (ctx: Context, _session: Session | null, opts: {
    text: string;
    label?: string;
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<span class="asx-chat-pasted-text-token ${esc(opts.class ?? "")}" title="${esc(opts.text)}"><i class="ph ph-clipboard-text" aria-hidden="true"></i><span>${esc(opts.label ?? "Pasted text")}</span></span>`;
}
