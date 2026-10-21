export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label?: string; value?: number; min?: number; max?: number; step?: number; showValue?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/inputBits.js" });
    const value = opts.value ?? opts.min ?? 0;
    return `<label class="asx-slider ${esc(opts.class ?? "")}" data-asx-slider>${opts.label ? `<span class="asx-slider__head"><span class="asx-field__label">${esc(opts.label)}</span>${opts.showValue ? `<output data-asx-slider-value>${esc(value)}</output>` : ""}</span>` : ""}
        <input type="range" name="${esc(opts.name)}" value="${esc(value)}" min="${esc(opts.min ?? 0)}" max="${esc(opts.max ?? 100)}" step="${esc(opts.step ?? 1)}">
        <script src="${esc(src)}" defer></script>
    </label>`;
}
