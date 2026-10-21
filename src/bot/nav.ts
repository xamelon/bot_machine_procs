// Sidebar from $app_*.json. Permission is recorded on the card; auth is not here yet.
export default function (ctx: Context, _session: Session | null, opts?: { path?: string }) {
    const path = opts?.path ?? "/";
    const cards = Object.values(ctx.state.bot?.apps ?? {}).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
    const groups = [...new Set(cards.map((card) => card.group ?? "Bot"))];
    return ctx.fns.procs.ui.sideNav({
        title: "Bot",
        menus: groups.map((group) => ({
            label: group,
            items: cards.filter((card) => (card.group ?? "Bot") === group).map((card) => ({
                label: card.title,
                href: card.open,
                icon: card.icon ?? "ph-dot",
                active: path === card.open || (card.open !== "/bot" && path.startsWith(card.open)),
            })),
        })),
    });
}
