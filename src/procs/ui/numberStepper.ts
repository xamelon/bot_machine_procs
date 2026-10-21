export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label?: string; value?: number; min?: number; max?: number; step?: number; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/inputBits.js" });
    return `<label class="asx-number-stepper ${esc(opts.class ?? "")}" data-asx-number-stepper>${opts.label ? `<span class="asx-field__label">${esc(opts.label)}</span>` : ""}
        <span class="asx-number-stepper__control"><button type="button" data-asx-step="-1">−</button><input type="number" name="${esc(opts.name)}" value="${esc(opts.value ?? 0)}"${opts.min != null ? ` min="${esc(opts.min)}"` : ""}${opts.max != null ? ` max="${esc(opts.max)}"` : ""} step="${esc(opts.step ?? 1)}"><button type="button" data-asx-step="1">+</button></span>
        <script src="${esc(src)}" defer></script>
    </label>`;
}
