export default function (ctx: Context, _session: Session | null, opts: {
    items: Array<{ label: string; href?: string }>; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<nav class="asx-breadcrumbs ${esc(opts.class ?? "")}" aria-label="Breadcrumbs">${opts.items.map((it, i) => it.href && i < opts.items.length - 1 ? `<a href="${esc(it.href)}">${esc(it.label)}</a>` : `<span aria-current="${i === opts.items.length - 1 ? "page" : "false"}">${esc(it.label)}</span>`).join(`<i class="ph ph-caret-right" aria-hidden="true"></i>`)}</nav>`;
}
