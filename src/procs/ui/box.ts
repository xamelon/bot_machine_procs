// A white card with a titled strip on top — the workspace's one way of putting
// a list, a table or a rendered thing on the page. The strip says what is in it
// and how much; `right` is where a box-wide action goes.
//
// White on the page's grey, rather than the other way round: a box used to be
// transparent with a grey strip, which read as a card only while the page behind
// it stayed white. Now the page is the quiet surface and every box is raised off
// it, which is what makes a screen look composed instead of dumped.
//
// `body` is html, already rendered — and **the box makes any body sit right**,
// because what agents put in it is what the docs said they could: rows through
// ui.row, a table, a form, a description list, their own grid. Rows carry their
// own edge and are left alone. A `ui.table` is a card of its own on the page,
// and inside a box that was a frame in a frame — the box takes the table's
// frame off. Everything else — a form, a description list, text, a grid —
// brought no edge and sat hard against the frame, on every third screen an
// agent built; the box wraps it in `px-4 py-3`. The platform's own screens
// never nested a table or a form in a box, which is why nobody here saw it.
// `head` replaces the title with html when the strip itself is a control — a row
// of tabs over two readings of the same file, say — and then `title` is unused.
export default function (ctx: Context, _session: Session | null, opts: {title: string; head?: string; right?: string; body: string; empty?: string; class?: string }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-xs ${opts.class ?? ""}">
  <div class="flex items-center justify-between gap-3 border-b border-base-300 px-4 py-3 text-xs text-base-content/60">
    ${opts.head ?? `<span>${esc(opts.title)}</span>`}${opts.right ?? ""}
  </div>
  ${opts.body ? inside(opts.body) : `<div class="border-t border-base-300 px-4 py-3 text-xs text-base-content/60">${esc(opts.empty ?? "nothing here")}</div>`}
</div>`;
}

// The body as it sits in the box: a kit table loses its own frame, a body that
// brought its own edge (rows, a `p-`/`px-` of its own) is left alone, anything
// else gets the box's edge. Lists are NOT exempt: a bare <ul>/<ol> — the kit's
// timeline included — sat hard against the frame on every third screen an
// agent built, and "the padding is broken again" kept coming back through that
// hole. A list that wants the frame edge-to-edge says so with its own padding
// class, like everything else.
function inside(body: string): string {
    const tag = /^\s*<([a-z0-9-]+)([^>]*)>/i.exec(body);
    if (!tag) return `<div class="px-4 py-3">${body}</div>`;                        // bare text
    const [, name = "", attrs = ""] = tag;
    if (/\bui-table\b/.test(attrs)) return body.replace(/rounded-md border\b/, "").replace(/\bborder-base-300 bg-base-100\b/, "");
    if (/^(table|pre|iframe|img|textarea)$/i.test(name)) return body;
    if (/\b(p|px|pl|pr)-\d/.test(attrs)) return body;
    return `<div class="px-4 py-3">${body}</div>`;
}