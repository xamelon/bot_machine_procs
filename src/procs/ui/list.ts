export default function (ctx: Context, _session: Session | null, opts: {
    items: Array<{ title: string; description?: string; meta?: string; icon?: string; href?: string; id?: string; status?: string }>;
    entity?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const items = opts.items.map(item => {
        const tag = item.href ? "a" : "li";
        const href = item.href ? ` href="${esc(item.href)}"` : "";
        const marks = opts.entity ? " " + ctx.fns.procs.ui.attr({ entity: opts.entity, id: item.id, status: item.status }) : "";
        return `<${tag} class="asx-list__item"${href}${marks}>${item.icon ? `<i class="ph ${esc(item.icon)} text-base-content/60" aria-hidden="true"></i>` : "<span></span>"}<span><span class="asx-list__title">${esc(item.title)}</span>${item.description ? `<span class="asx-list__description">${esc(item.description)}</span>` : ""}</span>${item.meta ? `<span class="asx-list__meta">${esc(item.meta)}</span>` : "<span></span>"}</${tag}>`;
    }).join("");
    return `<ul class="asx-list ${esc(opts.class ?? "")}">${items}</ul>`;
}
