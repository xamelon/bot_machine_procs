export default function (ctx: Context, _session: Session | null, opts: {
    body: string; items: Array<{ label: string; icon?: string; danger?: boolean; disabled?: boolean; action?: string }>; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/layer.js" });
    const items = opts.items.map(it => `<button class="asx-context-menu__item" role="menuitem" type="button"${it.danger ? ` data-danger="true"` : ""}${it.disabled ? " disabled" : ""}${it.action ? ` ${ctx.fns.procs.ui.attr({ action: it.action })}` : ""}>${it.icon ? `<i class="ph ${esc(it.icon)}" aria-hidden="true"></i>` : `<span></span>`}<span>${esc(it.label)}</span></button>`).join("");
    return `<span class="asx-context-menu ${esc(opts.class ?? "")}" data-asx-context-root>
        <span data-asx-context-area>${opts.body}</span>
        <span class="asx-context-menu__panel" data-asx-context-panel role="menu" hidden>${items}</span>
        <script src="${esc(src)}" defer></script>
    </span>`;
}
