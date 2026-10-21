export default function (ctx: Context, _session: Session | null, opts: {
    id?: string; label?: string; placeholder?: string; items: Array<{ label: string; description?: string; icon?: string; href?: string; action?: string; badge?: string }>;
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const id = opts.id ?? `asx-command-${Math.random().toString(36).slice(2)}`;
    const items = opts.items.map((item) => {
        const inner = `${item.icon ? `<i class="ph ${esc(item.icon)}" aria-hidden="true"></i>` : `<span class="asx-command-menu__spacer"></span>`}<span class="asx-command-menu__text"><span class="asx-command-menu__label">${esc(item.label)}</span>${item.description ? `<span class="asx-command-menu__description">${esc(item.description)}</span>` : ""}</span>${item.badge ? ctx.fns.procs.ui.badge({ label: item.badge, variant: "purple" }) : ""}`;
        const attrs = `class="asx-command-menu__item" data-asx-command-item data-label="${esc(`${item.label} ${item.description ?? ""}`.toLowerCase())}" role="option"`;
        return item.href
            ? `<a ${attrs} href="${esc(item.href)}">${inner}</a>`
            : `<button ${attrs} type="button"${item.action ? ` ${ctx.fns.procs.ui.attr({ action: item.action })}` : ""}>${inner}</button>`;
    }).join("");
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/commandMenu.js" });
    return `<div class="asx-command-menu ${esc(opts.class ?? "")}" data-asx-command-root>
        <button class="asx-button asx-command-menu__trigger" data-variant="secondary" data-size="md" type="button" data-asx-command-trigger aria-haspopup="dialog" aria-controls="${esc(id)}">
            <span class="asx-button__icon"><i class="ph ph-command" aria-hidden="true"></i></span><span class="asx-button__label">${esc(opts.label ?? "Command menu")}</span><span class="asx-command-menu__kbd">⌘K</span>
        </button>
        <div class="asx-command-menu__overlay" data-asx-command-overlay hidden></div>
        <div id="${esc(id)}" class="asx-command-menu__panel" data-asx-command-panel role="dialog" aria-modal="true" hidden>
            <div class="asx-command-menu__search"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><input data-asx-command-input placeholder="${esc(opts.placeholder ?? "Search commands…")}" autocomplete="off"></div>
            <div class="asx-command-menu__list" role="listbox">${items}</div>
            <div class="asx-command-menu__empty" data-asx-command-empty hidden>No results</div>
        </div>
        <script src="${esc(src)}" defer></script>
    </div>`;
}
