export default function (ctx: Context, _session: Session | null, opts: {
    value?: number; max?: number; label?: string; tone?: "accent" | "success" | "warning" | "error"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const max = opts.max ?? 100;
    const value = Math.max(0, Math.min(max, opts.value ?? 0));
    return `<div class="asx-progress ${esc(opts.class ?? "")}" data-tone="${esc(opts.tone ?? "accent")}" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="${max}" aria-label="${esc(opts.label ?? "Progress")}"><span style="width:${(value / max) * 100}%"></span></div>`;
}
