export default function (ctx: Context, _session: Session | null, opts: {
    name: string;
    label: string;
    value?: string;
    placeholder?: string;
    rows?: number;
    description?: string;
    required?: boolean;
    optional?: boolean;
    labelHidden?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    width?: string | number;
    status?: { type: "warning" | "error" | "success"; message?: string; messageID?: string };
    statusVariant?: "attached" | "detached" | "tooltip";
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const id = `asx-text-area-${Math.random().toString(36).slice(2)}`;
    const control = `<span class="asx-text-area-wrap"><textarea id="${esc(id)}" class="asx-input asx-textarea" data-size="md" name="${esc(opts.name)}"${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ""}${opts.rows ? ` rows="${esc(opts.rows)}"` : ""}${opts.disabled ? " disabled" : ""}${opts.readonly ? " readonly" : ""}${opts.required ? " required" : ""}>${esc(opts.value ?? "")}</textarea></span>`;
    return ctx.fns.procs.ui.field({
        label: opts.label,
        description: opts.description,
        control,
        inputID: id,
        required: opts.required,
        optional: opts.optional,
        labelHidden: opts.labelHidden,
        disabled: opts.disabled,
        status: opts.status,
        statusVariant: opts.statusVariant,
        width: opts.width,
        class: opts.class,
    });
}
