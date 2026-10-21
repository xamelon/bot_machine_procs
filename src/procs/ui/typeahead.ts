export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label?: string; value?: string; placeholder?: string;
    description?: string; required?: boolean; optional?: boolean; labelHidden?: boolean; width?: string | number;
    status?: { type: "warning" | "error" | "success"; message?: string; messageID?: string };
    statusVariant?: "attached" | "detached" | "tooltip";
    items: Array<{ label: string; value: string; description?: string; icon?: string }>;
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const selected = opts.items.find(i => i.value === opts.value);
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/choice.js" });
    const id = `asx-typeahead-${Math.random().toString(36).slice(2)}`;
    const items = opts.items.map(i => `<button class="asx-selector__item" data-asx-choice-option data-value="${esc(i.value)}" data-label="${esc(i.label.toLowerCase())}" type="button" role="option" aria-selected="${i.value === opts.value ? "true" : "false"}">
        ${i.icon ? `<i class="ph ${esc(i.icon)}" aria-hidden="true"></i>` : `<span class="asx-selector__spacer"></span>`}
        <span><strong>${esc(i.label)}</strong>${i.description ? `<small>${esc(i.description)}</small>` : ""}</span>
        <i class="ph ph-check asx-selector__check" aria-hidden="true"></i>
    </button>`).join("");
    const control = `<div class="asx-selector asx-typeahead ${esc(opts.label ? "" : (opts.class ?? ""))}" data-asx-choice-root data-mode="typeahead">
        <div class="asx-selector__trigger asx-typeahead__control" data-asx-choice-trigger role="combobox" aria-haspopup="listbox" aria-expanded="false">
            <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
            <input id="${esc(id)}" data-asx-choice-input placeholder="${esc(opts.placeholder ?? "Search…")}" value="${esc(selected?.label ?? "")}" autocomplete="off"${opts.required ? " required" : ""}${opts.status?.type ? ` aria-invalid="${opts.status.type === "error" ? "true" : "false"}"` : ""}>
        </div>
        <input type="hidden" name="${esc(opts.name)}" value="${esc(selected?.value ?? "")}" data-asx-choice-hidden>
        <div class="asx-selector__panel" data-asx-choice-panel hidden>
            <div class="asx-selector__list" role="listbox">${items}</div>
            <div class="asx-selector__empty" data-asx-choice-empty hidden>No results</div>
        </div>
        <script src="${esc(src)}" defer></script>
    </div>`;
    if (!opts.label && !opts.description && !opts.status) return control;
    return ctx.fns.procs.ui.field({
        label: opts.label ?? opts.name,
        description: opts.description,
        control,
        inputID: id,
        required: opts.required,
        optional: opts.optional,
        labelHidden: opts.labelHidden,
        status: opts.status,
        statusVariant: opts.statusVariant,
        width: opts.width,
        class: opts.class,
    });
}
