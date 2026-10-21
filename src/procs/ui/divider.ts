export default function (ctx: Context, _session: Session | null, opts: {
    orientation?: "horizontal" | "vertical"; weight?: "default" | "emphasized"; bleed?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-divider ${esc(opts.class ?? "")}" data-orientation="${esc(opts.orientation ?? "horizontal")}" data-weight="${esc(opts.weight ?? "default")}"${opts.bleed ? ` data-bleed="true"` : ""} role="separator" aria-orientation="${esc(opts.orientation ?? "horizontal")}"></div>`;
}
