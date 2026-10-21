export default function (ctx: Context, _session: Session | null, opts: {
    title?: string; logo?: string; menus: Array<{ label?: string; items: Array<{ label: string; href?: string; icon?: string; active?: boolean; badge?: string }> }>; footer?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    // The items navigate with htmx (see `navItem`), which swaps `#main` and leaves
    // this aside in place — so the active item has to be re-decided from the url
    // after each swap. That is what nav.js does, and it is emitted here because a
    // nav without it is a nav that lies about where you are.
    const loader = `<script src="${esc(ctx.fns.procs.ui.asset({ href: "/procs/ui/nav.js" }))}" defer></script>`;
    return `<aside class="asx-side-nav ${esc(opts.class ?? "")}">${opts.title || opts.logo ? `<div class="asx-side-nav__brand">${opts.logo ?? ""}${opts.title ? `<strong>${esc(opts.title)}</strong>` : ""}</div>` : ""}<div class="asx-side-nav__menus">${opts.menus.map(m => ctx.fns.procs.ui.navMenu(m)).join("")}</div>${opts.footer ? `<div class="asx-side-nav__footer">${opts.footer}</div>` : ""}</aside>${loader}`;
}
