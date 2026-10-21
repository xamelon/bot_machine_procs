export default function (ctx: Context, _session: Session | null, opts: {
    name: string;
    label: string;
    value?: string;
    placeholder?: string;
    type?: "text" | "password" | "email";
    size?: "sm" | "md" | "lg";
    description?: string;
    required?: boolean;
    optional?: boolean;
    labelHidden?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    autocomplete?: string;
    width?: string | number;
    status?: { type: "warning" | "error" | "success"; message?: string; messageID?: string };
    statusVariant?: "attached" | "detached" | "tooltip";
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const id = `asx-text-input-${Math.random().toString(36).slice(2)}`;
    const control = ctx.fns.procs.ui.input({
        name: opts.name,
        value: opts.value,
        placeholder: opts.placeholder,
        type: opts.type ?? "text",
        size: opts.size,
        disabled: opts.disabled,
        required: opts.required,
        autocomplete: opts.autocomplete,
        ariaLabel: opts.labelHidden ? opts.label : undefined,
        class: opts.status?.type ? `asx-input--${esc(opts.status.type)}` : "",
    }).replace("<input ", `<input id="${esc(id)}"${opts.readonly ? " readonly" : ""} `);
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
