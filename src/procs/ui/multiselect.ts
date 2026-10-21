export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label?: string; placeholder?: string; values?: string[]; items: Array<{ label: string; value: string; description?: string }>;
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const selected = new Set(opts.values ?? []);
    const chips = opts.items.filter(i => selected.has(i.value)).map(i => ctx.fns.procs.ui.token({ label: i.label, removable: true, attrs: `data-value="${esc(i.value)}"`, removeAttrs: `data-asx-ms-remove="${esc(i.value)}"` })).join("");
    const hidden = [...selected].map(v => `<input type="hidden" name="${esc(opts.name)}" value="${esc(v)}" data-asx-ms-hidden="${esc(v)}">`).join("");
    const options = opts.items.map(i => `<button type="button" class="asx-multiselect__option" data-asx-ms-option data-value="${esc(i.value)}" data-label="${esc(i.label.toLowerCase())}" aria-selected="${selected.has(i.value) ? "true" : "false"}">
        <span><strong>${esc(i.label)}</strong>${i.description ? `<small>${esc(i.description)}</small>` : ""}</span><i class="ph ph-check" aria-hidden="true"></i>
    </button>`).join("");
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/multiselect.js" });
    const tokenSrc = ctx.fns.procs.ui.asset({ href: "/procs/ui/token.js" });
    return `<div class="asx-multiselect ${esc(opts.class ?? "")}" data-asx-ms-root data-name="${esc(opts.name)}" data-placeholder="${esc(opts.placeholder ?? "Select…")}">
        ${opts.label ? `<label class="asx-field__label">${esc(opts.label)}</label>` : ""}
        <div class="asx-multiselect__control" data-asx-ms-trigger tabindex="0" role="combobox" aria-haspopup="listbox" aria-expanded="false">
            <span class="asx-multiselect__chips" data-asx-ms-chips>${chips || `<span class="asx-multiselect__placeholder">${esc(opts.placeholder ?? "Select…")}</span>`}</span>
            <span class="asx-multiselect__chevron"><i class="ph ph-caret-down" aria-hidden="true"></i></span>
        </div>
        <div data-asx-ms-hidden-box>${hidden}</div>
        <div class="asx-multiselect__panel" data-asx-ms-panel hidden>
            <div class="asx-command-menu__search"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><input data-asx-ms-input placeholder="Filter…" autocomplete="off"></div>
            <div class="asx-multiselect__list" role="listbox" aria-multiselectable="true">${options}</div>
        </div>
        <script src="${esc(tokenSrc)}" defer></script>
        <script src="${esc(src)}" defer></script>
    </div>`;
}
