export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label?: string; value?: string; items: Array<{ label: string; value: string; description?: string; icon?: string; badge?: string }>; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const cards = opts.items.map(i => `<label class="asx-complex-selector__option" data-selected="${i.value === opts.value ? "true" : "false"}">
        <input type="radio" name="${esc(opts.name)}" value="${esc(i.value)}"${i.value === opts.value ? " checked" : ""}>
        ${i.icon ? `<i class="ph ${esc(i.icon)}" aria-hidden="true"></i>` : ""}
        <span class="asx-complex-selector__main"><strong>${esc(i.label)}</strong>${i.description ? `<small>${esc(i.description)}</small>` : ""}</span>
        ${i.badge ? ctx.fns.procs.ui.badge({ label: i.badge, variant: "blue" }) : ""}
    </label>`).join("");
    return `<fieldset class="asx-complex-selector ${esc(opts.class ?? "")}">${opts.label ? `<legend class="asx-field__label">${esc(opts.label)}</legend>` : ""}<div class="asx-complex-selector__grid">${cards}</div></fieldset>`;
}
