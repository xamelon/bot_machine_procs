export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label?: string; value?: number; min?: number; max?: number; step?: number; placeholder?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<label class="asx-number-input ${esc(opts.class ?? "")}">
        ${opts.label ? `<span class="asx-field__label">${esc(opts.label)}</span>` : ""}
        <input class="asx-input" type="number" name="${esc(opts.name)}"${opts.value != null ? ` value="${esc(opts.value)}"` : ""}${opts.min != null ? ` min="${esc(opts.min)}"` : ""}${opts.max != null ? ` max="${esc(opts.max)}"` : ""}${opts.step != null ? ` step="${esc(opts.step)}"` : ""} placeholder="${esc(opts.placeholder ?? "")}">
    </label>`;
}
