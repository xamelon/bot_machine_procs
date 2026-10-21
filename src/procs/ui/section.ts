const VARIANT = { surface: "surface", muted: "muted", transparent: "transparent" } as const;

export default function (ctx: Context, _session: Session | null, opts: {
    body: string; variant?: keyof typeof VARIANT; title?: string; subtitle?: string; actions?: string; padding?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const padding = opts.padding ?? 4;
    const head = opts.title || opts.subtitle || opts.actions ? `<div class="asx-section__header"><div>${opts.title ? `<div class="asx-section__title">${esc(opts.title)}</div>` : ""}${opts.subtitle ? `<div class="asx-section__subtitle">${esc(opts.subtitle)}</div>` : ""}</div>${opts.actions ? `<div class="asx-section__actions">${opts.actions}</div>` : ""}</div>` : "";
    return `<section class="asx-section ${esc(opts.class ?? "")}" data-variant="${esc(opts.variant ?? "surface")}" data-padding="${esc(padding)}">${head}<div class="asx-section__body">${opts.body}</div></section>`;
}
