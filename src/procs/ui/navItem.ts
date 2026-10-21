export default function (ctx: Context, _session: Session | null, opts: {
    label: string; href?: string; icon?: string; active?: boolean; badge?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const attrs = `class="asx-nav-item ${esc(opts.class ?? "")}" data-active="${opts.active ? "true" : "false"}"`;
    const body = `${opts.icon ? `<i class="ph ${esc(opts.icon)}" aria-hidden="true"></i>` : ""}<span>${esc(opts.label)}</span>${opts.badge ? ctx.fns.procs.ui.badge({ label: opts.badge, variant: "purple" }) : ""}`;
    // A nav link navigates the way the framework already answers: `hx-boost`
    // makes it an htmx request, `toResponse` sees `HX-Request` and returns the
    // fragment instead of the document, and its `HX-Retarget` puts that fragment
    // in `#main`. So the sidebar, the chat and every open tab keep their state
    // across a page change, and the browser downloads no stylesheet or script it
    // already has. Without javascript the anchor is still an anchor.
    return opts.href
        ? `<a ${attrs} href="${esc(opts.href)}" hx-boost="true">${body}</a>`
        : `<button ${attrs} type="button">${body}</button>`;
}
