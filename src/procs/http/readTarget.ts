// Which element on the page the request was aimed at — the id in `HX-Target`,
// or "" when nothing was (a plain navigation, or a target with no id).
//
// **htmx 4 sends `tag#id`, not `id`.** `hx-target="#mgr-nav"` arrives as
// `nav#mgr-nav`, `#main` as `div#main` — the tag name is there so two elements
// that share an id are still told apart. A handler that answers one of two
// lists by comparing the header to `"mgr-nav"` therefore matched under htmx 2
// and matches nothing now, silently: the rail asks, the grid comes back, and the
// grid is swapped into the rail. So the shape is parsed here, once, and read by
// name everywhere else.
export default function (_ctx: Context, _session: Session | null, opts: { req: Request }): string {
    const header = opts.req.headers.get("hx-target") ?? "";
    return header.includes("#") ? decodeURI(header.slice(header.indexOf("#") + 1)) : "";
}
