export default function (ctx: Context, _session: Session | null, opts: {
    message: string; tone?: "info" | "success" | "warning" | "error"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const icon = opts.tone === "success" ? "ph-check-circle" : opts.tone === "warning" ? "ph-warning" : opts.tone === "error" ? "ph-x-circle" : "ph-info";
    return `<div class="asx-field-status ${esc(opts.class ?? "")}" data-tone="${esc(opts.tone ?? "info")}"><i class="ph ${icon}" aria-hidden="true"></i><span>${esc(opts.message)}</span></div>`;
}
