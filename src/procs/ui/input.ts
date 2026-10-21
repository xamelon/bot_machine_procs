export default function (ctx: Context, _session: Session | null, opts: {
    name: string; value?: string; placeholder?: string; type?: string; size?: "sm" | "md" | "lg"; textarea?: boolean;
    disabled?: boolean; required?: boolean; autocomplete?: string; class?: string; ariaLabel?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const attrs = [
        `class="asx-input ${opts.textarea ? "asx-textarea" : ""} ${esc(opts.class ?? "")}"`,
        `data-size="${esc(opts.size ?? "md")}"`,
        `name="${esc(opts.name)}"`,
        opts.value != null ? `value="${esc(opts.value)}"` : "",
        opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : "",
        opts.ariaLabel ? `aria-label="${esc(opts.ariaLabel)}"` : "",
        opts.disabled ? "disabled" : "",
        opts.required ? "required" : "",
        opts.autocomplete ? `autocomplete="${esc(opts.autocomplete)}"` : "",
    ].filter(Boolean).join(" ");
    if (opts.textarea) return `<textarea ${attrs}>${esc(opts.value ?? "")}</textarea>`;
    return `<input ${attrs} type="${esc(opts.type ?? "text")}">`;
}
