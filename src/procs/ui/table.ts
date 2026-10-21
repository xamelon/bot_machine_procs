export default function (ctx: Context, _session: Session | null, opts: {
    columns: Array<{ key: string; label: string; wrap?: boolean; render?: (row: any) => string }>;
    rows: any[]; empty?: string; entity?: string; rowId?: string; rowHref?: (row: any) => string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const head = opts.columns.map(c => `<th data-wrap="${c.wrap ? "true" : "false"}">${esc(c.label)}</th>`).join("");
    const idKey = opts.rowId ?? "id";
    const body = opts.rows.map(row => {
        const cells = opts.columns.map(c => `<td data-wrap="${c.wrap ? "true" : "false"}" ${ctx.fns.procs.ui.attr({ role: c.key })}>${c.render ? c.render(row) : esc(row[c.key])}</td>`).join("");
        const mark = opts.entity ? ctx.fns.procs.ui.attr({ entity: opts.entity, id: row[idKey], status: row.status }) : "";
        const href = opts.rowHref?.(row);
        return `<tr ${mark}${href ? ` data-href="${esc(href)}" onclick="location.href='${esc(href)}'"` : ""}>${cells}</tr>`;
    }).join("") || `<tr><td colspan="${opts.columns.length}" class="text-base-content/60">${esc(opts.empty ?? "Nothing here")}</td></tr>`;
    return `<div class="asx-table-wrap ${esc(opts.class ?? "")}"><table class="asx-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
