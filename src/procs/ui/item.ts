export default function (ctx: Context, _session: Session | null, opts: {
    title?: string; heading?: string; description?: string; body?: string;
    start?: string; end?: string; href?: string; class?: string;
    entity?: string; id?: string; status?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const inner = `${opts.start ? `<span class="asx-item__start">${opts.start}</span>` : ""}<div class="asx-item__main"><div class="asx-item__title">${opts.heading ?? esc(opts.title)}</div>${opts.description ? `<span class="asx-item__description">${esc(opts.description)}</span>` : ""}${opts.body ?? ""}</div>${opts.end ? `<span class="asx-item__end">${opts.end}</span>` : ""}`;
    const marks = ctx.fns.procs.ui.attr({ entity: opts.entity, id: opts.id, status: opts.status });
    return opts.href ? `<a class="asx-item ${esc(opts.class ?? "")}" ${marks} href="${esc(opts.href)}">${inner}</a>` : `<div class="asx-item ${esc(opts.class ?? "")}" ${marks}>${inner}</div>`;
}
