export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label?: string; accept?: string; multiple?: boolean; class?: string; mode?: "input" | "dropzone";
    description?: string; required?: boolean; optional?: boolean; labelHidden?: boolean; width?: string | number;
    status?: { type: "warning" | "error" | "success"; message?: string; messageID?: string };
    statusVariant?: "attached" | "detached" | "tooltip";
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/inputBits.js" });
    const mode = opts.mode ?? "input";
    const id = `asx-file-${Math.random().toString(36).slice(2)}`;
    const control = `<label class="asx-file-input ${esc(opts.label ? "" : (opts.class ?? ""))}" data-asx-file data-mode="${esc(mode)}">
        <span class="asx-file-input__drop"><i class="ph ph-upload-simple" aria-hidden="true"></i><span data-asx-file-label>${opts.multiple ? "Choose files" : "Choose file"}</span></span>
        <input id="${esc(id)}" type="file" name="${esc(opts.name)}"${opts.accept ? ` accept="${esc(opts.accept)}"` : ""}${opts.multiple ? " multiple" : ""}${opts.required ? " required" : ""}${opts.status?.type ? ` aria-invalid="${opts.status.type === "error" ? "true" : "false"}"` : ""}>
        <script src="${esc(src)}" defer></script>
    </label>`;
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
