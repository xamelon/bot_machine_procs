export default function (ctx: Context, _session: Session | null, opts: {
    body: string; columns?: number | string; gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const cols = typeof opts.columns === "number" ? `repeat(${opts.columns}, minmax(0, 1fr))` : opts.columns ?? "repeat(auto-fit, minmax(180px, 1fr))";
    // Fixed columns stack into one on a narrow screen (core css); auto-fit adapts by itself.
    const stack = /auto-(fit|fill)/.test(cols) ? "" : " data-stack";
    return `<div class="asx-grid ${esc(opts.class ?? "")}" data-gap="${esc(opts.gap ?? 3)}"${stack} style="--asx-grid-columns:${esc(cols)}">${opts.body}</div>`;
}
