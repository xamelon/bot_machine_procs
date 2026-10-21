export default function (ctx: Context, _session: Session | null, opts: {
    id: string; trigger: string; title?: string; body: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/layer.js" });
    return `<span data-asx-sheet-open="${esc(opts.id)}">${opts.trigger}</span><div id="${esc(opts.id)}" class="asx-bottom-sheet ${esc(opts.class ?? "")}" data-asx-sheet hidden>
        <div class="asx-bottom-sheet__backdrop" data-asx-sheet-close></div>
        <section class="asx-bottom-sheet__panel" role="dialog" aria-modal="true">
            <div class="asx-bottom-sheet__grabber"></div>
            <header>${opts.title ? `<strong>${esc(opts.title)}</strong>` : ""}<button type="button" data-asx-sheet-close aria-label="Close">×</button></header>
            <div class="asx-bottom-sheet__body">${opts.body}</div>
        </section>
        <script src="${esc(src)}" defer></script>
    </div>`;
}
