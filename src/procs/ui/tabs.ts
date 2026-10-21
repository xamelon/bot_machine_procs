export default function (ctx: Context, _session: Session | null, opts: {
    items: Array<{ label: string; value: string; href?: string; icon?: string }>; value?: string; size?: "sm" | "md" | "lg"; divider?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const value = opts.value ?? opts.items[0]?.value;
    const tabs = opts.items.map((item, i) => {
        const selected = item.value === value;
        const body = `${item.icon ? `<i class="ph ${esc(item.icon)}" aria-hidden="true"></i>` : ""}<span>${esc(item.label)}</span><span class="asx-tabs__indicator" data-selected="${selected ? "selected" : ""}"></span>`;
        return item.href
            ? `<a class="asx-tabs__tab" data-selected="${selected ? "true" : "false"}" data-size="${esc(opts.size ?? "md")}" role="tab" aria-selected="${selected ? "true" : "false"}" tabindex="${selected || i === 0 ? "0" : "-1"}" href="${esc(item.href)}">${body}</a>`
            : `<button class="asx-tabs__tab" data-selected="${selected ? "true" : "false"}" data-size="${esc(opts.size ?? "md")}" role="tab" aria-selected="${selected ? "true" : "false"}" tabindex="${selected || i === 0 ? "0" : "-1"}" type="button">${body}</button>`;
    }).join("");
    return `<div class="asx-tabs ${esc(opts.class ?? "")}" data-divider="${opts.divider ? "true" : "false"}" role="tablist">${tabs}</div>`;
}
