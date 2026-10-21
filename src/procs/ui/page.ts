export default function (ctx: Context, _session: Session | null, opts: {page: string; title?: string; count?: number; lead?: string; crumbs?: string; back?: string; backLabel?: string; right?: string; main: string }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const back = opts.back
        ? ctx.fns.procs.ui.button({ label: opts.backLabel ?? "Back", href: opts.back, get: opts.back, push: true, variant: "ghost", icon: "ph-arrow-left", action: "back" })
        : "";
    return `<section class="asx-page" ${ctx.fns.procs.ui.attr({ page: opts.page })}>
${opts.crumbs ? `<div class="mb-2">${opts.crumbs}</div>` : ""}
${opts.title ? `<div class="flex items-center gap-2">${back}<h1 class="asx-heading" data-level="1">${esc(opts.title)}</h1>${opts.count == null ? "" : ctx.fns.procs.ui.badge({ label: String(opts.count), role: "count" })}${opts.right ? `<span class="asx-page__right">${opts.right}</span>` : ""}</div>` : ""}
${opts.lead ? `<p class="asx-text" data-size="body" data-tone="secondary">${opts.lead}</p>` : ""}
<div class="asx-page__main">${opts.main}</div>
</section>`;
}
