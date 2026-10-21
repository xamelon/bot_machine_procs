export default function (ctx: Context, _session: Session | null, opts: {
    icon: string; label?: string; active?: boolean; href?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const attrs = `class="asx-nav-icon ${esc(opts.class ?? "")}" data-active="${opts.active ? "true" : "false"}" aria-label="${esc(opts.label ?? opts.icon)}"`;
    const body = `<i class="ph ${esc(opts.icon)}" aria-hidden="true"></i>`;
    return opts.href ? `<a ${attrs} href="${esc(opts.href)}">${body}</a>` : `<span ${attrs}>${body}</span>`;
}
