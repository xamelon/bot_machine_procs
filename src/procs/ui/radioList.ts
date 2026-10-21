export default function (ctx: Context, _session: Session | null, opts: {
    name: string; value?: string; items: Array<{ label: string; value: string; description?: string; disabled?: boolean }>; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-radio-list ${esc(opts.class ?? "")}" role="radiogroup">${opts.items.map(i => `<label class="asx-radio">
        <input type="radio" name="${esc(opts.name)}" value="${esc(i.value)}"${i.value === opts.value ? " checked" : ""}${i.disabled ? " disabled" : ""}>
        <span class="asx-radio__mark"></span>
        <span class="asx-radio__text"><span>${esc(i.label)}</span>${i.description ? `<small>${esc(i.description)}</small>` : ""}</span>
    </label>`).join("")}</div>`;
}
