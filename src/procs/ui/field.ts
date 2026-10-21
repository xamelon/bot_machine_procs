export default function (ctx: Context, _session: Session | null, opts: {
    label: string;
    control: string;
    description?: string;
    hint?: string;
    status?: { type: "warning" | "error" | "success"; message?: string; messageID?: string };
    statusVariant?: "attached" | "detached" | "tooltip";
    inputID?: string;
    descriptionID?: string;
    required?: boolean;
    optional?: boolean;
    labelHidden?: boolean;
    disabled?: boolean;
    width?: string | number;
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const statusVariant = opts.statusVariant ?? "attached";
    const status = opts.status;
    const description = opts.description ?? opts.hint;
    const width = opts.width == null ? "" : ` style=\"width:${typeof opts.width === "number" ? `${opts.width}px` : esc(opts.width)}\"`;
    const marker = opts.required ? "Required" : opts.optional ? "Optional" : "";
    const labelAttrs = `${opts.inputID ? ` for=\"${esc(opts.inputID)}\"` : ""}${opts.labelHidden ? ` data-hidden=\"true\"` : ""}${opts.disabled ? ` aria-disabled=\"true\"` : ""}`;
    const label = `<span class=\"asx-field__label-group\"${opts.labelHidden ? ` data-hidden=\"true\"` : ""}>
        <label class=\"asx-field__label\"${labelAttrs}>${esc(opts.label)}${marker ? ` <span class=\"asx-field__marker\">${esc(marker)}</span>` : ""}</label>
        ${description ? `<span class=\"asx-field__description\"${opts.descriptionID ? ` id=\"${esc(opts.descriptionID)}\"` : ""}>${esc(description)}</span>` : ""}
    </span>`;
    const statusNode = status?.message && statusVariant !== "tooltip"
        ? `<div class=\"asx-field-status\" data-tone=\"${esc(status.type)}\" data-variant=\"${esc(statusVariant)}\"${status.messageID ? ` id=\"${esc(status.messageID)}\"` : ""}>${statusVariant === "detached" ? `<i class=\"ph ${status.type === "success" ? "ph-check-circle" : status.type === "warning" ? "ph-warning" : "ph-x-circle"}\" aria-hidden=\"true\"></i>` : ""}<span>${esc(status.message)}</span></div>`
        : "";
    const control = `<span class=\"asx-field__control-stack\">${opts.control}${statusNode}</span>`;
    return `<div class=\"asx-field ${esc(opts.class ?? "")}\" data-status=\"${esc(status?.type ?? "")}\" data-status-variant=\"${esc(statusVariant)}\"${opts.disabled ? ` aria-disabled=\"true\"` : ""}${width}>${label}${control}</div>`;
}
