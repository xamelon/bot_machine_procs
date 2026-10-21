export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label: string; description?: string; checked?: boolean; disabled?: boolean; value?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<label class="asx-checkbox ${esc(opts.class ?? "")}">
        <input type="checkbox" name="${esc(opts.name)}" value="${esc(opts.value ?? "on")}"${opts.checked ? " checked" : ""}${opts.disabled ? " disabled" : ""}>
        <span class="asx-checkbox__box"><i class="ph ph-check" aria-hidden="true"></i></span>
        <span class="asx-checkbox__text"><span>${esc(opts.label)}</span>${opts.description ? `<small>${esc(opts.description)}</small>` : ""}</span>
    </label>`;
}
