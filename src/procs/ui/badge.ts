const TONE = { neutral: "neutral", info: "info", success: "success", warning: "warning", danger: "error", error: "error" } as const;

export default function (ctx: Context, _session: Session | null, opts: {
    label?: string; text?: string; variant?: "neutral" | "accent" | "info" | "success" | "warning" | "error" | "blue" | "purple" | "teal";
    tone?: keyof typeof TONE; icon?: string; role?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const variant = opts.variant ?? TONE[opts.tone ?? "neutral"] ?? "neutral";
    return `<span class="asx-badge ${esc(opts.class ?? "")}" data-variant="${esc(variant)}" ${ctx.fns.procs.ui.attr({ role: opts.role })}>${opts.icon ? `<i class="ph ${esc(opts.icon)}" aria-hidden="true"></i>` : ""}${esc(opts.label ?? opts.text ?? "")}</span>`;
}
