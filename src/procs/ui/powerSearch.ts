type PowerSearchField = {
    key: string; label: string; icon?: string;
    operators: Array<{ key: string; label: string; type?: "text" | "number" | "select" | "empty" | "string_list" | "enum_list" | "entity_list" | "date" | "date_range"; options?: Array<{ label: string; value: string }> }>;
};
type PowerSearchFilter = { field: string; operator: string; value?: string };

const editorType = (filter: any, op: string) => {
    if (op === "missing" || op === "exists") return "empty";
    if (filter.options?.length) return "select";
    if (filter.type === "boolean") return "select";
    if (filter.type === "integer" || filter.type === "number") return "number";
    if (filter.type === "date" || filter.type === "datetime") return "date";
    return "text";
};
const fieldsFromCatalog = (filters: any[]): PowerSearchField[] => filters.map(filter => ({
    key: filter.id,
    label: filter.label,
    icon: "ph-funnel",
    operators: filter.operators.map((op: string) => ({
        key: op,
        label: op,
        type: editorType(filter, op),
        options: filter.options ?? (filter.type === "boolean" ? [{ label: "Yes", value: "true" }, { label: "No", value: "false" }] : undefined),
    })),
}));

export default function (ctx: Context, _session: Session | null, opts: {
    name: string; subject?: string; fields?: PowerSearchField[]; filters?: PowerSearchFilter[]; query?: string; placeholder?: string; size?: "sm" | "md" | "lg"; class?: string;
    label?: string; description?: string; required?: boolean; optional?: boolean; labelHidden?: boolean; width?: string | number;
    status?: { type: "warning" | "error" | "success"; message?: string; messageID?: string };
    statusVariant?: "attached" | "detached" | "tooltip";
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const fields = opts.fields ?? (opts.subject ? fieldsFromCatalog(ctx.fns.bot.filterCatalog({ subject: opts.subject })) : []);
    const filters = opts.filters ?? [];
    const fieldsJson = JSON.stringify(fields);
    const filtersJson = JSON.stringify(filters);
    const treeJson = JSON.stringify({ all: filters.map(f => ({ filter: f.field, op: f.operator, value: f.value ?? "" })) });
    const fieldLabel = (key: string) => fields.find(f => f.key === key)?.label ?? key;
    const opLabel = (field: string, op: string) => fields.find(f => f.key === field)?.operators.find(o => o.key === op)?.label ?? op;
    const id = `asx-power-search-${Math.random().toString(36).slice(2)}`;
    const tokens = filters.map((f, i) => ctx.fns.procs.ui.token({
        label: `${fieldLabel(f.field)}: ${opLabel(f.field, f.operator)}`,
        value: f.value,
        removable: true,
        attrs: `role="button" tabindex="0" data-asx-ps-token="${i}"`,
        removeAttrs: `data-asx-ps-remove="${i}"`,
    })).join("");
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/powerSearch.js" });
    const tokenSrc = ctx.fns.procs.ui.asset({ href: "/procs/ui/token.js" });
    const control = `<div class="asx-power-search ${esc(opts.label ? "" : (opts.class ?? ""))}" data-asx-ps-root data-fields="${esc(fieldsJson)}" data-filters="${esc(filtersJson)}" data-name="${esc(opts.name)}" data-placeholder="${esc(opts.placeholder ?? "Search or add filter…")}" data-size="${esc(opts.size ?? "md")}"${opts.subject ? ` data-tree="1" data-subject="${esc(opts.subject)}"` : ""}>
        <div class="asx-power-search__box" data-asx-ps-box role="combobox" aria-haspopup="dialog" aria-expanded="false" data-has-tokens="${(opts.filters ?? []).length ? "true" : "false"}"${opts.required ? " aria-required=\"true\"" : ""}${opts.status?.type ? ` aria-invalid="${opts.status.type === "error" ? "true" : "false"}"` : ""}>
            <i class="ph ph-magnifying-glass asx-power-search__icon" aria-hidden="true"></i>
            <div class="asx-power-search__tokens" data-asx-ps-tokens>${tokens}</div>
            <input id="${esc(id)}" class="asx-power-search__input" data-asx-ps-input${opts.subject ? ` name="q"` : ""} value="${esc(opts.query ?? "")}" placeholder="${esc(opts.placeholder ?? (opts.subject ? "Search or add filter…" : "Search or add filter…"))}" autocomplete="off">
            <button class="asx-power-search__add" data-asx-ps-add type="button" aria-label="Add filter"><i class="ph ph-plus" aria-hidden="true"></i></button>
        </div>
        <input type="hidden" name="${esc(opts.name)}" value="${esc(opts.subject ? treeJson : filtersJson)}" data-asx-ps-hidden>
        <div class="asx-power-search__menu" data-asx-ps-menu role="listbox" hidden></div>
        <div class="asx-power-search__editor" data-asx-ps-editor hidden></div>
        <script src="${esc(tokenSrc)}" defer></script>
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
        width: opts.width ?? "100%",
        class: opts.class,
    });
}
