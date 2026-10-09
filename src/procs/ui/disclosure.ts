// Something folded away, opened in place: a `<details>` whose summary is a kit
// button (give `summary`) or a row of your own (give `trigger`), and whose body
// is whatever was hidden. It is not a menu — a menu is a list of actions in a
// panel over the page (`ui.menu`); this pushes the page down and can hold
// anything, a form included.
//
// The summary wears exactly what `ui.button` writes for that tone and size,
// read off a rendered one so the two can never drift, plus the two rules a
// `<summary>` needs: no marker triangle, either browser's.
export default function (ctx: Context, _session: Session | null, opts: {
    summary?: { label: string; icon?: string; html?: string; tone?: "default" | "primary" | "ghost" | "danger" | "outline"; size?: "xs" | "sm" | "md" };
    trigger?: string; body: string; open?: boolean;
    // What pressing it tells the server, for a fold that is remembered. The
    // wiring is on the SUMMARY and fires on a click — never on the <details>'s
    // own `toggle` event, which Chrome also fires for every `<details open>` it
    // inserts, so a swapped-in column would tell the server it had just been
    // folded six times. A click on the summary still opens or shuts it: htmx
    // does not prevent a summary's default.
    post?: string; on?: string; swap?: string; vals?: Record<string, any>;
    role?: string; entity?: string; id?: string; status?: string; action?: string;
    class?: string; summaryClass?: string; bodyClass?: string;
    // The words a summary that is only a glyph says on hover, and is announced as.
    tip?: string;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const button = ctx.fns.procs.ui.button({ action: "disclose", label: "", tone: opts.summary?.tone ?? "default", size: opts.summary?.size ?? "sm" });
    const classes = button.match(/class="([^"]*)"/)?.[1] ?? "btn btn-sm";
    const hx = opts.post
        ? ` hx-post="${esc(opts.post)}" hx-trigger="${esc(opts.on ?? "click")}" hx-swap="${esc(opts.swap ?? "none")}"${opts.vals ? ` hx-vals='${esc(JSON.stringify(opts.vals))}'` : ""}`
        : "";
    const summary = opts.summary
        ? `<summary class="ui-focusable list-none [&::-webkit-details-marker]:hidden ${classes} ${opts.summaryClass ?? ""}"${hx}>${opts.summary.icon ? `<i class="ph ${esc(opts.summary.icon)}" aria-hidden="true"></i>` : ""}${esc(opts.summary.label)}${opts.summary.html ?? ""}</summary>`
        : `<summary class="ui-focusable cursor-pointer list-none [&::-webkit-details-marker]:hidden ${opts.summaryClass ?? ""}"${opts.tip ? ` data-tip="${esc(opts.tip)}" aria-label="${esc(opts.tip)}"` : ""}${hx}>${opts.trigger ?? ""}</summary>`;
    return `<details class="${opts.class ?? ""}" ${ctx.fns.procs.ui.attr({ action: opts.action, role: opts.role, entity: opts.entity, id: opts.id, status: opts.status })}${opts.open ? " open" : ""}>
  ${summary}
  ${opts.bodyClass ? `<div class="${opts.bodyClass}">${opts.body}</div>` : opts.body}
</details>`;
}
