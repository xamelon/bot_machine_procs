// Responsive columns follow the available pane width, not the browser window.
export default function (ctx: Context, _session: Session | null, opts: {
    body: string;
    columns?: number | string | { narrow?: number | string; medium?: number | string; wide?: number | string };
    gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const value = (cols: number | string) => typeof cols === "number" ? `repeat(${cols}, minmax(0, 1fr))` : cols;
    const cols = opts.columns ?? "repeat(auto-fit, minmax(180px, 1fr))";
    // Keep existing fixed-column grids' phone fallback; explicit breakpoints
    // below are container-relative, for layouts that need pane-aware columns.
    if (typeof cols !== "object") {
        const stack = /auto-(fit|fill)/.test(String(cols)) ? "" : " data-stack";
        return `<div class="asx-grid ${esc(opts.class ?? "")}" data-gap="${esc(opts.gap ?? 3)}"${stack} style="--asx-grid-columns:${esc(value(cols))}">${opts.body}</div>`;
    }
    const responsive = cols;
    const style = `--asx-grid-columns:${value(responsive.narrow ?? 1)}`
        + (responsive.medium != null ? `;--asx-grid-medium:${value(responsive.medium)}` : "")
        + (responsive.wide != null ? `;--asx-grid-wide:${value(responsive.wide)}` : "");
    return `<div class="asx-grid ${esc(opts.class ?? "")}" data-gap="${esc(opts.gap ?? 3)}"${responsive.medium != null ? " data-medium" : ""}${responsive.wide != null ? " data-wide" : ""} style="${esc(style)}">${opts.body}</div>`;
}
