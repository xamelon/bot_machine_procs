export default function (ctx: Context, _session: Session | null, opts: {
    label?: string; icon?: string; trigger?: string; align?: "start" | "end"; width?: string; items: Array<{ label?: string; description?: string; icon?: string; href?: string; action?: string; danger?: boolean; disabled?: boolean; divider?: boolean; checked?: boolean; type?: "item" | "checkbox" | "radio"; name?: string; value?: string; items?: Array<{ label: string; icon?: string; danger?: boolean; disabled?: boolean }> }>; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/layer.js" });
    const trigger = opts.trigger ?? `<button class="asx-button asx-dropdown-menu__trigger" data-variant="secondary" data-size="md" type="button" data-asx-menu-trigger aria-haspopup="menu" aria-expanded="false">${opts.icon ? `<span class="asx-button__icon"><i class="ph ${esc(opts.icon)}" aria-hidden="true"></i></span>` : ""}<span class="asx-button__label">${esc(opts.label ?? "Menu")}</span><span class="asx-button__end"><i class="ph ph-caret-down" aria-hidden="true"></i></span></button>`;
    const item = (it: (typeof opts.items)[number]) => {
        if (it.divider) return `<div class="asx-dropdown-menu__divider" role="separator"></div>`;
        if (it.items?.length) {
            const sub = it.items.map(child => `<button class="asx-dropdown-menu__item" role="menuitem" type="button"${child.danger ? ` data-danger="true"` : ""}${child.disabled ? " disabled aria-disabled=\"true\"" : ""}>${child.icon ? `<i class="ph ${esc(child.icon)}" aria-hidden="true"></i>` : `<span class="asx-dropdown-menu__spacer"></span>`}<span class="asx-dropdown-menu__text"><span>${esc(child.label)}</span></span></button>`).join("");
            return `<div class="asx-dropdown-menu__submenu"><button class="asx-dropdown-menu__item" role="menuitem" type="button" aria-haspopup="menu" aria-expanded="false">${it.icon ? `<i class="ph ${esc(it.icon)}" aria-hidden="true"></i>` : `<span class="asx-dropdown-menu__spacer"></span>`}<span class="asx-dropdown-menu__text"><span>${esc(it.label ?? "")}</span></span><i class="ph ph-caret-right" aria-hidden="true"></i></button><div class="asx-dropdown-menu__subpanel" role="menu">${sub}</div></div>`;
        }
        const role = it.type === "checkbox" ? "menuitemcheckbox" : it.type === "radio" ? "menuitemradio" : "menuitem";
        const icon = it.checked ? "ph-check" : it.icon;
        const body = `${icon ? `<i class="ph ${esc(icon)}" aria-hidden="true"></i>` : `<span class="asx-dropdown-menu__spacer"></span>`}<span class="asx-dropdown-menu__text"><span>${esc(it.label ?? "")}</span>${it.description ? `<small>${esc(it.description)}</small>` : ""}</span>`;
        const attrs = `class="asx-dropdown-menu__item" role="${role}" ${it.checked != null ? `aria-checked="${it.checked ? "true" : "false"}"` : ""} ${it.danger ? `data-danger="true"` : ""} ${it.disabled ? `aria-disabled="true"` : ""}`;
        return it.href && !it.disabled ? `<a ${attrs} href="${esc(it.href)}">${body}</a>` : `<button ${attrs} type="button"${it.action ? ` ${ctx.fns.procs.ui.attr({ action: it.action })}` : ""}${it.disabled ? " disabled" : ""}${it.name ? ` data-name="${esc(it.name)}"` : ""}${it.value ? ` data-value="${esc(it.value)}"` : ""}>${body}</button>`;
    };
    return `<div class="asx-dropdown-menu ${esc(opts.class ?? "")}" data-asx-menu-root data-align="${esc(opts.align ?? "end")}" style="${opts.width ? `--asx-menu-width:${esc(opts.width)}` : ""}">
        ${trigger}
        <div class="asx-dropdown-menu__panel" data-asx-menu-panel role="menu" tabindex="-1" hidden>${opts.items.map(item).join("")}</div>
        <script src="${esc(src)}" defer></script>
    </div>`;
}
