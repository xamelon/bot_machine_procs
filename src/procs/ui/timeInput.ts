export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label?: string; value?: string; min?: string; max?: string; step?: number; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<label class="asx-time-input ${esc(opts.class ?? "")}">${opts.label ? `<span class="asx-field__label">${esc(opts.label)}</span>` : ""}<input class="asx-input" type="time" name="${esc(opts.name)}" value="${esc(opts.value ?? "")}"${opts.min ? ` min="${esc(opts.min)}"` : ""}${opts.max ? ` max="${esc(opts.max)}"` : ""}${opts.step ? ` step="${esc(opts.step)}"` : ""}></label>`;
}
