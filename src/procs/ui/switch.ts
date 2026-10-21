export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label: string; description?: string; checked?: boolean; disabled?: boolean; value?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<label class="asx-switch ${esc(opts.class ?? "")}">
        <span class="asx-switch__text"><span>${esc(opts.label)}</span>${opts.description ? `<small>${esc(opts.description)}</small>` : ""}</span>
        <input type="checkbox" name="${esc(opts.name)}" value="${esc(opts.value ?? "on")}"${opts.checked ? " checked" : ""}${opts.disabled ? " disabled" : ""}>
        <span class="asx-switch__track"><span class="asx-switch__thumb"></span></span>
    </label>`;
}
