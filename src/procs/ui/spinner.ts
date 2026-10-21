export default function (ctx: Context, _session: Session | null, opts: {
    label?: string; size?: "sm" | "md" | "lg"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<span class="asx-spinner ${esc(opts.class ?? "")}" data-size="${esc(opts.size ?? "md")}" role="status" aria-label="${esc(opts.label ?? "Loading")}"></span>`;
}
