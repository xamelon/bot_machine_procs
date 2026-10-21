export default function (ctx: Context, _session: Session | null, opts: {
    title?: string; body: string; href?: string; action?: string; icon?: string; selected?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const attrs = `class="asx-clickable-card ${esc(opts.class ?? "")}"${opts.selected ? ` data-selected="true"` : ""}${opts.action ? ` ${ctx.fns.procs.ui.attr({ action: opts.action })}` : ""}`;
    const inner = `${opts.icon ? `<i class="ph ${esc(opts.icon)}" aria-hidden="true"></i>` : ""}<span class="asx-clickable-card__main">${opts.title ? `<span class="asx-clickable-card__title">${esc(opts.title)}</span>` : ""}<span class="asx-clickable-card__body">${opts.body}</span></span><i class="ph ph-caret-right asx-clickable-card__chevron" aria-hidden="true"></i>`;
    return opts.href ? `<a ${attrs} href="${esc(opts.href)}">${inner}</a>` : `<button ${attrs} type="button">${inner}</button>`;
}
