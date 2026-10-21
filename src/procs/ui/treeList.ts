type TreeItem = { label: string; href?: string; icon?: string; badge?: string; selected?: boolean; children?: TreeItem[] };

export default function (ctx: Context, _session: Session | null, opts: {
    items: TreeItem[]; label?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/structure.js" });
    const render = (items: TreeItem[], level = 1): string => `<ul class="asx-tree-list__group" role="group">${items.map((it) => {
        const has = !!it.children?.length;
        const row = `${has ? `<button class="asx-tree-list__twisty" data-asx-tree-toggle type="button" aria-label="Toggle"><i class="ph ph-caret-right" aria-hidden="true"></i></button>` : `<span class="asx-tree-list__twisty"></span>`}${it.icon ? `<i class="ph ${esc(it.icon)}" aria-hidden="true"></i>` : ""}<span>${esc(it.label)}</span>${it.badge ? ctx.fns.procs.ui.badge({ label: it.badge, variant: "purple" }) : ""}`;
        const node = it.href ? `<a class="asx-tree-list__row" href="${esc(it.href)}" data-selected="${it.selected ? "true" : "false"}">${row}</a>` : `<div class="asx-tree-list__row" data-selected="${it.selected ? "true" : "false"}">${row}</div>`;
        return `<li class="asx-tree-list__item" role="treeitem" aria-level="${level}"${has ? ` aria-expanded="true"` : ""}>${node}${has ? render(it.children!, level + 1) : ""}</li>`;
    }).join("")}</ul>`;
    return `<nav class="asx-tree-list ${esc(opts.class ?? "")}" role="tree" aria-label="${esc(opts.label ?? "Tree")}">${render(opts.items)}<script src="${esc(src)}" defer></script></nav>`;
}
