export default function (ctx: Context, _session: Session | null, opts: {
    width?: string; height?: string; radius?: "inner" | "element" | "container" | "full"; lines?: number; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const one = (i = 0) => `<span class="asx-skeleton ${esc(opts.class ?? "")}" data-radius="${esc(opts.radius ?? "element")}" style="${opts.width ? `width:${esc(opts.width)};` : ""}${opts.height ? `height:${esc(opts.height)};` : ""}${i && i === (opts.lines ?? 1) - 1 ? "width:70%;" : ""}"></span>`;
    return opts.lines && opts.lines > 1 ? `<span class="asx-skeleton-stack">${Array.from({length: opts.lines}, (_, i) => one(i)).join("")}</span>` : one();
}
