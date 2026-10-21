export default function (ctx: Context, _session: Session | null, opts: {
    trigger: string; body: string; title?: string; align?: "start" | "end"; width?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/layer.js" });
    return `<span class="asx-popover ${esc(opts.class ?? "")}" data-asx-popover-root data-align="${esc(opts.align ?? "start")}" style="${opts.width ? `--asx-popover-width:${esc(opts.width)}` : ""}">
        <span data-asx-popover-trigger>${opts.trigger}</span>
        <span class="asx-popover__panel" data-asx-popover-panel hidden role="dialog">
            ${opts.title ? `<span class="asx-popover__title">${esc(opts.title)}</span>` : ""}
            <span class="asx-popover__body">${opts.body}</span>
        </span>
        <script src="${esc(src)}" defer></script>
    </span>`;
}
