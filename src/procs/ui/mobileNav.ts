export default function (ctx: Context, _session: Session | null, opts: {
    items: Array<{ label: string; href?: string; icon: string; active?: boolean; badge?: string }>; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<nav class="asx-mobile-nav ${esc(opts.class ?? "")}" aria-label="Mobile navigation">${opts.items.map(i => `<a class="asx-mobile-nav__item" data-active="${i.active ? "true" : "false"}" href="${esc(i.href ?? "#")}"><i class="ph ${esc(i.icon)}" aria-hidden="true"></i><span>${esc(i.label)}</span>${i.badge ? `<em>${esc(i.badge)}</em>` : ""}</a>`).join("")}</nav>`;
}
