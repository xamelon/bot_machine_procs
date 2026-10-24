export default function (ctx: Context, _session: Session | null, opts: {
    title?: string; body?: string; tone?: "neutral" | "info" | "success" | "warning" | "error"; actions?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<section class="asx-banner ${esc(opts.class ?? "")}" data-tone="${esc(opts.tone ?? "neutral")}"><div>${opts.title ? `<div class="asx-banner__title">${esc(opts.title)}</div>` : ""}${opts.body ? `<div class="asx-banner__body">${esc(opts.body)}</div>` : ""}</div>${opts.actions ? `<div class="asx-banner__actions">${opts.actions}</div>` : ""}</section>`;
}
