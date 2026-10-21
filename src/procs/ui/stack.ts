export default function (ctx: Context, _session: Session | null, opts: {
    body: string; gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6; direction?: "vertical" | "horizontal"; align?: "start" | "center" | "end" | "stretch"; justify?: "start" | "center" | "end" | "between"; wrap?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-stack ${esc(opts.class ?? "")}" data-direction="${esc(opts.direction ?? "vertical")}" data-gap="${esc(opts.gap ?? 3)}" data-align="${esc(opts.align ?? "stretch")}" data-justify="${esc(opts.justify ?? "start")}"${opts.wrap ? ` data-wrap="true"` : ""}>${opts.body}</div>`;
}
