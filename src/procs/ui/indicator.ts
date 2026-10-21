export default function (ctx: Context, _session: Session | null, opts: {
    tone?: "accent" | "success" | "warning" | "error" | "neutral"; label?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<span class="asx-indicator ${esc(opts.class ?? "")}" data-tone="${esc(opts.tone ?? "accent")}">${opts.label ? esc(opts.label) : ""}</span>`;
}
