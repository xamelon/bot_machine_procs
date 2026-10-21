export default function (ctx: Context, _session: Session | null, opts: {
    content: string; trigger: string; placement?: "top" | "bottom" | "left" | "right"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<span class="asx-tooltip ${esc(opts.class ?? "")}" data-placement="${esc(opts.placement ?? "top")}">${opts.trigger}<span class="asx-tooltip__bubble" role="tooltip">${esc(opts.content)}</span></span>`;
}
