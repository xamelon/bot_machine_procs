// Sidebar from $app_*.json. Permission is recorded on the card; auth is not here yet.
export default function (ctx: Context, _session: Session | null, opts?: { path?: string }) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const path = opts?.path ?? "/";
    const cards = Object.values(ctx.state.bot?.apps ?? {}).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
    const groups = [...new Set(cards.map((card) => card.group ?? "Bot"))];
    const links = groups.map((group) => {
        const items = cards.filter((card) => (card.group ?? "Bot") === group).map((card) => {
            const active = path === card.open || (card.open !== "/bot" && path.startsWith(card.open));
            return `<a class="flex items-center gap-2 rounded-lg px-2 py-1.5 ${active ? "bg-primary/10 font-medium" : "hover:bg-base-200"}" href="${esc(card.open)}" ${ctx.fns.procs.ui.attr({ action: "open", id: card.name })}><i class="ph ${esc(card.icon ?? "ph-dot")} text-base" aria-hidden="true"></i>${esc(card.title)}</a>`;
        }).join("");
        return `<div class="mt-4 text-[11px] font-medium uppercase tracking-wide text-base-content/50">${esc(group)}</div><div class="mt-1 space-y-0.5">${items}</div>`;
    }).join("");
    return `<aside class="flex w-56 shrink-0 flex-col border-r border-base-300 bg-base-100 p-4"><strong>Bot</strong>${links}</aside>`;
}
