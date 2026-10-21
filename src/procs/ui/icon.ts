export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label?: string; size?: "sm" | "md" | "lg"; tone?: "primary" | "secondary" | "accent" | "success" | "warning" | "error"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<i class="asx-icon ph ${esc(opts.name)} ${esc(opts.class ?? "")}" data-size="${esc(opts.size ?? "md")}" data-tone="${esc(opts.tone ?? "primary")}"${opts.label ? ` role="img" aria-label="${esc(opts.label)}"` : ` aria-hidden="true"`}></i>`;
}
