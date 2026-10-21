export default function (ctx: Context, _session: Session | null, opts: {
    body: string; title?: string; description?: string; right?: string;
    variant?: "default" | "transparent" | "muted"; elevation?: "none" | "low" | "med";
    padding?: number | string; class?: string; width?: string | number; height?: string | number; minHeight?: string | number;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const style = [
        opts.padding != null ? `--asx-card-padding:${typeof opts.padding === "number" ? opts.padding + "px" : opts.padding}` : "",
        opts.width != null ? `width:${typeof opts.width === "number" ? opts.width + "px" : opts.width}` : "",
        opts.height != null ? `height:${typeof opts.height === "number" ? opts.height + "px" : opts.height}` : "",
        opts.minHeight != null ? `min-height:${typeof opts.minHeight === "number" ? opts.minHeight + "px" : opts.minHeight}` : "",
    ].filter(Boolean).join(";");
    const head = opts.title ? `<div class="asx-card__head"><div><div class="asx-card__title">${esc(opts.title)}</div>${opts.description ? `<div class="asx-card__description">${esc(opts.description)}</div>` : ""}</div>${opts.right ?? ""}</div>` : "";
    return `<section class="asx-card ${esc(opts.class ?? "")}" data-variant="${esc(opts.variant ?? "default")}" data-elevation="${esc(opts.elevation ?? "none")}"${style ? ` style="${esc(style)}"` : ""}>${head}${opts.body}</section>`;
}
