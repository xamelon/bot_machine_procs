export default function (ctx: Context, _session: Session | null, opts: {
    start?: string; center?: string; end?: string; size?: "sm" | "md" | "lg"; variant?: "surface" | "muted" | "transparent"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-toolbar ${esc(opts.class ?? "")}" data-size="${esc(opts.size ?? "md")}" data-variant="${esc(opts.variant ?? "surface")}" role="toolbar">
        <div class="asx-toolbar__start">${opts.start ?? ""}</div>
        ${opts.center ? `<div class="asx-toolbar__center">${opts.center}</div>` : ""}
        <div class="asx-toolbar__end">${opts.end ?? ""}</div>
    </div>`;
}
