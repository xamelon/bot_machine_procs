export default function (ctx: Context, _session: Session | null, opts: {
    label: string;
    inputID?: string;
    description?: string;
    descriptionID?: string;
    required?: boolean;
    optional?: boolean;
    hidden?: boolean;
    disabled?: boolean;
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const marker = opts.required ? "Required" : opts.optional ? "Optional" : "";
    return `<span class="asx-field__label-group ${esc(opts.class ?? "")}"${opts.hidden ? ` data-hidden="true"` : ""}>
        <label class="asx-field__label"${opts.inputID ? ` for="${esc(opts.inputID)}"` : ""}${opts.disabled ? ` aria-disabled="true"` : ""}>${esc(opts.label)}${marker ? ` <span class="asx-field__marker">${esc(marker)}</span>` : ""}</label>
        ${opts.description ? `<span class="asx-field__description"${opts.descriptionID ? ` id="${esc(opts.descriptionID)}"` : ""}>${esc(opts.description)}</span>` : ""}
    </span>`;
}
