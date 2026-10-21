export default function (ctx: Context, _session: Session | null, opts: {
    title: string; description?: string; start?: string; end?: string; href?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const inner = `${opts.start ? `<span class="asx-item__start">${opts.start}</span>` : ""}<span class="asx-item__main"><span class="asx-item__title">${esc(opts.title)}</span>${opts.description ? `<span class="asx-item__description">${esc(opts.description)}</span>` : ""}</span>${opts.end ? `<span class="asx-item__end">${opts.end}</span>` : ""}`;
    return opts.href ? `<a class="asx-item ${esc(opts.class ?? "")}" href="${esc(opts.href)}">${inner}</a>` : `<div class="asx-item ${esc(opts.class ?? "")}">${inner}</div>`;
}
