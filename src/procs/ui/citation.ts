export default function (ctx: Context, _session: Session | null, opts: {
    title: string; source?: string; href?: string; excerpt?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const title = opts.href ? `<a href="${esc(opts.href)}">${esc(opts.title)}</a>` : esc(opts.title);
    return `<aside class="asx-citation ${esc(opts.class ?? "")}"><div class="asx-citation__title">${title}</div>${opts.source ? `<div class="asx-citation__source">${esc(opts.source)}</div>` : ""}${opts.excerpt ? `<p>${esc(opts.excerpt)}</p>` : ""}</aside>`;
}
