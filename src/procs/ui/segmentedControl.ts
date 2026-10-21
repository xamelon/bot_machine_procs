export default function (ctx: Context, _session: Session | null, opts: {
    name: string; items: Array<{ label: string; value: string; icon?: string; disabled?: boolean }>; value?: string; size?: "sm" | "md" | "lg"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const value = opts.value ?? opts.items[0]?.value;
    const items = opts.items.map((item) => {
        const selected = item.value === value;
        return `<label class="asx-segmented-control__item" data-size="${esc(opts.size ?? "md")}">
            <input type="radio" name="${esc(opts.name)}" value="${esc(item.value)}"${selected ? " checked" : ""}${item.disabled ? " disabled" : ""}>
            ${item.icon ? `<i class="ph ${esc(item.icon)}" aria-hidden="true"></i>` : ""}
            <span>${esc(item.label)}</span>
        </label>`;
    }).join("");
    return `<div class="asx-segmented-control ${esc(opts.class ?? "")}" data-size="${esc(opts.size ?? "md")}" role="radiogroup">${items}</div>`;
}
