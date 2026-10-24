export default function (ctx: Context, _session: Session | null, opts: {
    columns: Array<{ key: string; label: string; wrap?: boolean; render?: (row: any) => string }>;
    rows: any[]; empty?: string; entity?: string; rowId?: string; rowHref?: (row: any) => string; class?: string;
    // expand returns the detail body for a row (HTML). A row without a body gets
    // no toggle, so a table can mix rows with and without details.
    expand?: (row: any) => string | null; expandLabel?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const expand = typeof opts.expand === "function" ? opts.expand : null;
    const label = opts.expandLabel ?? "Details";
    const width = opts.columns.length + (expand ? 1 : 0);
    const head = [
        ...opts.columns.map(c => `<th data-wrap="${c.wrap ? "true" : "false"}">${esc(c.label)}</th>`),
        ...(expand ? [`<th class="asx-table__toggle-head"></th>`] : []),
    ].join("");
    const idKey = opts.rowId ?? "id";
    const body = opts.rows.map(row => {
        const cells = opts.columns.map(c => `<td data-wrap="${c.wrap ? "true" : "false"}" ${ctx.fns.procs.ui.attr({ role: c.key })}>${c.render ? c.render(row) : esc(row[c.key])}</td>`).join("");
        const mark = opts.entity ? ctx.fns.procs.ui.attr({ entity: opts.entity, id: row[idKey], status: row.status }) : "";
        const href = opts.rowHref?.(row);
        const detail = expand ? expand(row) : null;
        const toggle = expand ? `<td class="asx-table__toggle">${detail
            ? `<button type="button" class="asx-table__expand" aria-expanded="false" aria-label="${esc(label)}" title="${esc(label)}" onclick="var r=this.closest('tr'),d=r.nextElementSibling;if(!d||!d.classList.contains('asx-table__detail'))return;var show=d.hasAttribute('hidden');if(show){d.removeAttribute('hidden')}else{d.setAttribute('hidden','')}this.setAttribute('aria-expanded',String(show));r.setAttribute('data-open',String(show))"><i class="ph ph-caret-right" aria-hidden="true"></i></button>`
            : ""}</td>` : "";
        const main = `<tr ${mark}${href ? ` data-href="${esc(href)}" onclick="location.href='${esc(href)}'"` : ""}>${cells}${toggle}</tr>`;
        if (!detail) return main;
        return `${main}<tr class="asx-table__detail" hidden><td colspan="${width}" data-wrap="true">${detail}</td></tr>`;
    }).join("") || `<tr><td colspan="${width}" class="asx-table__empty">${esc(opts.empty ?? "Nothing here")}</td></tr>`;
    return `<div class="asx-table-wrap ${esc(opts.class ?? "")}"><table class="asx-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
