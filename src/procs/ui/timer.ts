export default function (ctx: Context, _session: Session | null, opts: {
    seconds: number; label?: string; tone?: "neutral" | "success" | "warning" | "error"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const m = Math.floor(opts.seconds / 60);
    const s = opts.seconds % 60;
    return `<span class="asx-timer ${esc(opts.class ?? "")}" data-tone="${esc(opts.tone ?? "neutral")}" role="timer" aria-label="${esc(opts.label ?? "Timer")}"><i class="ph ph-clock" aria-hidden="true"></i>${esc(String(m).padStart(2, "0"))}:${esc(String(s).padStart(2, "0"))}</span>`;
}
