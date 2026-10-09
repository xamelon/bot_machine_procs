// A real table — column headers over rows — for a register you scan by column
// rather than read down. A row is an entity (`data-entity`+`data-id`, `data-status`
// when it has one) and each cell carries its column key as `data-role`, so the
// workspace points at a cell the same way it does in a box of rows. `href` makes
// the whole row a link; a column's `render` is for a cell that is a badge or a
// link rather than text. A cell does not wrap — a number or a date broken over
// two lines is unreadable, and the frame scrolls sideways — unless the column
// says `wrap: true` for prose that may.
export default function (ctx: Context, _session: Session | null, opts: {
    columns: Array<{ key: string; label: string; class?: string; wrap?: boolean; render?: (row: any) => string }>;
    rows: any[]; entity?: string; rowId?: string; rowHref?: (row: any) => string;
    empty?: string; class?: string;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const idKey = opts.rowId ?? "id";
    const cls = (c: { class?: string; wrap?: boolean }) => `${c.wrap ? "" : "whitespace-nowrap "}${c.class ?? ""}`;
    const head = opts.columns.map(c => `<th class="${cls(c)}">${esc(c.label)}</th>`).join("");
    const body = opts.rows.map(row => {
        const href = opts.rowHref?.(row);
        const cells = opts.columns.map(c => `<td class="${cls(c)}" ${ctx.fns.procs.ui.attr({ role: c.key })}>${c.render ? c.render(row) : esc(row[c.key])}</td>`).join("");
        const marks = opts.entity ? ctx.fns.procs.ui.attr({ entity: opts.entity, id: row[idKey], status: row.status }) : "";
        return href
            ? `<tr class="hover:bg-base-200 cursor-pointer" ${marks} hx-get="${esc(href)}" hx-target="#main" hx-swap="innerHTML" hx-push-url="true">${cells}</tr>`
            : `<tr class="hover:bg-base-200" ${marks}>${cells}</tr>`;
    }).join("");

    // `table-sm` is the density a register needs; daisyUI's default row height is
    // built for a landing page, not for a hundred patients.
    // `ui-table` is the mark `ui.box` looks for: a table on the page is a card of
    // its own, a table inside a box is not — the box takes this frame off.
    return `<div class="ui-table border-base-300 bg-base-100 overflow-x-auto rounded-md border ${opts.class ?? ""}">
  <table class="table table-sm table-pin-rows tabular-nums">
    <thead><tr>${head}</tr></thead>
    <tbody>${body || `<tr><td colspan="${opts.columns.length}" class="text-base-content/60">${esc(opts.empty ?? "nothing here")}</td></tr>`}</tbody>
  </table>
</div>`;
}
