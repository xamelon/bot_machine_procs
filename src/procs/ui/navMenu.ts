export default function (ctx: Context, _session: Session | null, opts: {
    label?: string; items: Array<{ label: string; href?: string; icon?: string; active?: boolean; badge?: string }>; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<nav class="asx-nav-menu ${esc(opts.class ?? "")}"${opts.label ? ` aria-label="${esc(opts.label)}"` : ""}>${opts.label ? `<div class="asx-nav-menu__label">${esc(opts.label)}</div>` : ""}${opts.items.map(i => ctx.fns.procs.ui.navItem(i)).join("")}</nav>`;
}
