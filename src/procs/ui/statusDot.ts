const TONE = { success: "success", warning: "warning", error: "error", info: "info", neutral: "neutral" } as const;

export default function (ctx: Context, _session: Session | null, opts: {
    tone?: keyof typeof TONE; label?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const tone = opts.tone ?? "neutral";
    const label = opts.label ?? tone;
    return `<span class="asx-status-dot ${esc(opts.class ?? "")}" data-tone="${esc(tone)}" role="img" aria-label="${esc(label)}"></span>`;
}
