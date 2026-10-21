export default function (ctx: Context, _session: Session | null, opts: {
    name: string;
    label: string;
    value?: string;
    dateValue?: string;
    timeValue?: string;
    description?: string;
    required?: boolean;
    optional?: boolean;
    labelHidden?: boolean;
    disabled?: boolean;
    width?: string | number;
    status?: { type: "warning" | "error" | "success"; message?: string; messageID?: string };
    statusVariant?: "attached" | "detached" | "tooltip";
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const id = `asx-date-time-${Math.random().toString(36).slice(2)}`;
    const date = opts.dateValue ?? opts.value?.slice(0, 10) ?? "";
    const time = opts.timeValue ?? (opts.value?.includes("T") ? opts.value.slice(11, 16) : "");
    const control = `<span class="asx-date-time-input" id="${esc(id)}">
        <input class="asx-input" data-size="md" type="date" name="${esc(opts.name)}_date" value="${esc(date)}"${opts.disabled ? " disabled" : ""}${opts.required ? " required" : ""}>
        <input class="asx-input" data-size="md" type="time" name="${esc(opts.name)}_time" value="${esc(time)}"${opts.disabled ? " disabled" : ""}${opts.required ? " required" : ""}>
        <input type="hidden" name="${esc(opts.name)}" value="${esc(opts.value ?? (date && time ? `${date}T${time}` : ""))}">
    </span>`;
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
