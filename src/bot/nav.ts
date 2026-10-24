// Sidebar from $app_*.json. A card with a `permission` shows only to operators
// whose role grants it (team.can); the footer says who is signed in.
export default function (ctx: Context, session: Session | null, opts?: { path?: string }) {
    const path = opts?.path ?? "/";
    const cards = Object.values(ctx.state.bot?.apps ?? {}).filter((card) => ctx.fns.team.can({ permission: card.permission })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
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
        footer: account(ctx, session),
    });
}

function account(ctx: Context, session: Session | null) {
    const user = session?.user;
    if (!user) return undefined;
    const ui = ctx.fns.procs.ui;
    // A plain link and a plain form: both leave the app for the supervisor's own
    // pages, so neither is boosted into #main.
    const who = ui.vStack({ gap: 0, body: ui.text({ text: user.name, weight: "semibold", class: "bot-account__line" }) + ui.text({ text: `${user.login} · ${user.role}`, tone: "secondary", size: "supporting", class: "bot-account__line" }) });
    const actions = ui.hStack({ gap: 2, align: "center", justify: "between", body: ui.link({ href: "/_auth/password", label: "Password" }) + `<form method="post" action="/_auth/logout">${ui.button({ label: "Sign out", size: "sm", variant: "ghost", type: "submit" })}</form>` });
    return ui.vStack({ gap: 2, class: "bot-account", body: who + actions });
}
