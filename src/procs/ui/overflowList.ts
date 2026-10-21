export default function (ctx: Context, _session: Session | null, opts: {
    items: string[]; max?: number; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const max = opts.max ?? 4;
    const shown = opts.items.slice(0, max).join("");
    const rest = opts.items.slice(max);
    const more = rest.length ? ctx.fns.procs.ui.popover({ trigger: `<button class="asx-overflow-list__more" type="button">+${rest.length}</button>`, body: `<div class="asx-overflow-list__popover">${rest.join("")}</div>`, align: "end" }) : "";
    return `<div class="asx-overflow-list ${esc(opts.class ?? "")}">${shown}${more}</div>`;
}
