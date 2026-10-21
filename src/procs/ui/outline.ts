export default function (ctx: Context, _session: Session | null, opts: {
    items: Array<{ label: string; href: string; level?: 1 | 2 | 3; current?: boolean }>; label?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<nav class="asx-outline ${esc(opts.class ?? "")}" aria-label="${esc(opts.label ?? "Table of contents")}">${opts.items.map(i => `<a href="${esc(i.href)}" data-level="${esc(i.level ?? 1)}" data-current="${i.current ? "true" : "false"}">${esc(i.label)}</a>`).join("")}</nav>`;
}
