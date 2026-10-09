// One row of a box, and the reason the convention holds: a row is an entity, so
// it carries `entity`+`id` (and `status` when it has one) and every cell it is
// made of carries its `role`. Written this way a module cannot produce a row the
// workspace is unable to point at, and `page.state` reports the cells as the
// entity's fields without anyone thinking about it.
//
// `href` makes the row a link — page.open({entity,id}) follows it — and htmx
// swaps the pane rather than reloading the window.
export default function (ctx: Context, _session: Session | null, opts: {
    entity: string; id: string; status?: string; href?: string;
    cells: Array<{ role: string; text?: string; html?: string; class?: string; title?: string }>;
    right?: string;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    // A row is one flex line on a desk — and a STACK in a phone-wide container.
    // Three cells across 390px squeezed the name into a three-line ribbon while
    // the value and the date stood beside it; the portal's shell (and every
    // host's <main>) is a @container, so in a narrow one the first cell takes
    // the whole line and the rest fall onto a meta line under it, the last cell
    // keeping the right edge. Two cells still fit a phone line and stay one.
    const narrow = opts.cells.length >= 3;
    // `title` is for a cell that truncates: a drug name is sixty characters and a
    // column is not, so the whole of it stays reachable by resting on it.
    const cells = opts.cells.map((c, i) => {
        const own = c.class ?? "min-w-0 flex-1 truncate";
        const fold = narrow ? (i === 0 ? " @max-md:basis-full" : i === opts.cells.length - 1 ? " @max-md:ml-auto" : "") : "";
        return `<span class="${own}${fold}"${c.title ? ` title="${esc(c.title)}"` : ""} ${ctx.fns.procs.ui.attr({ role: c.role })}>${c.html ?? esc(c.text)}</span>`;
    }).join("");
    const marks = ctx.fns.procs.ui.attr({ entity: opts.entity, id: opts.id, status: opts.status });
    const base = `flex items-center gap-3 border-t border-base-300 px-4 py-2.5${narrow ? " @max-md:flex-wrap @max-md:gap-y-1" : ""}`;
    const link = `href="${esc(opts.href)}" hx-get="${esc(opts.href)}" hx-target="#main" hx-swap="innerHTML" hx-push-url="true"`;

    // A link row with something of its own on the right — a button, a link
    // to somewhere else — is not one link: an <a> inside an <a> is not HTML,
    // and the browser closes the row around it, dropping the control onto a
    // line of its own. So the cells are the link and the right slot sits
    // beside it, on one line that hovers as a whole.
    if (opts.href && opts.right) return `<div class="${base} hover:bg-base-200"><a class="ui-focusable flex min-w-0 flex-1 items-center gap-3${narrow ? " @max-md:flex-wrap @max-md:gap-y-1" : ""}" ${link} ${marks}>${cells}</a>${opts.right}</div>`;
    return opts.href
        ? `<a class="ui-focusable ${base} hover:bg-base-200" ${link} ${marks}>${cells}</a>`
        : `<div class="${base}" ${marks}>${cells}${opts.right ?? ""}</div>`;
}
