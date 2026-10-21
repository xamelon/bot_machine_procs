export default function (ctx: Context, _session: Session | null, opts: {
    visible?: boolean; label?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<button class="asx-chat-layout-scroll-button ${esc(opts.class ?? "")}" data-visible="${opts.visible === false ? "false" : "true"}" type="button" aria-label="${esc(opts.label ?? "Scroll to bottom")}" data-asx-chat-scroll-bottom><i class="ph ph-arrow-down" aria-hidden="true"></i></button>`;
}
