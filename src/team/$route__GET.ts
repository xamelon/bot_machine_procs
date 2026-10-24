// Operator accounts. The page only reads `control_users`; every change is a
// plain form posted to the supervisor (`/_control/users…`), which owns the
// accounts, hashes passwords and comes back here with a notice. The runtime
// itself never gets to write an account.
const ROLE_ITEMS = [
    { label: "Admin", value: "admin", description: "Everything, including Pi, recovery and accounts" },
    { label: "Editor", value: "editor", description: "The whole bot admin" },
    { label: "Viewer", value: "viewer", description: "Read only" },
];

export default function (ctx: Context, session: Session | null, _opts: {}) {
    if (!ctx.fns.team.can({ permission: "team.manage" })) return { title: "Team", status: 403, main: ctx.fns.procs.ui.emptyState({ title: "Admins only", body: "Ask an admin to change accounts." }) };
    const ui = ctx.fns.procs.ui;
    const esc = (s: any) => ui.escape({ text: s });
    const url = session?.req ? new URL(session.req.url) : null;
    const notice = url?.searchParams.get("notice") ?? "";
    const tone = url?.searchParams.get("tone") === "error" ? "error" : "success";
    const me = session?.user?.id;

    const exists = ctx.fns.procs.db.select({ sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'control_users'" }).length > 0;
    if (!exists) return ctx.fns.bot.screen({ page: "team", title: "Team", lead: "Who can sign in to this admin.", main: ui.emptyState({ title: "No accounts here", body: "Accounts are created by the supervisor. Start the app with `bun run start`." }) });
    const rows = ctx.fns.procs.db.select({ sql: `SELECT u.id, u.login, u.name, u.role, u.disabled_at, u.created_at,
            (SELECT max(last_seen_at) FROM control_sessions s WHERE s.user_id = u.id AND s.expires_at > ?) seen
        FROM control_users u ORDER BY u.disabled_at IS NOT NULL, u.login`, params: [new Date().toISOString()] });

    // A plain form per action: it posts to the supervisor, which redirects back.
    const post = (id: string, action: string, body: string, confirm?: string) =>
        `<form method="post" action="/_control/users/${esc(id)}/${action}"${confirm ? ` onsubmit="return confirm('${esc(confirm)}')"` : ""}>${ui.hStack({ gap: 2, align: "center", body })}</form>`;
    const table = ui.table({ columns: [
        { key: "login", label: "Login", render: (row) => `<strong>${esc(row.login)}</strong>${row.id === me ? ` ${ui.badge({ label: "you", variant: "info" })}` : ""}${ui.text({ text: row.name, tone: "secondary", size: "supporting", as: "div" })}` },
        { key: "role", label: "Role", render: (row) => post(row.id, "role", `${ui.selector({ name: "role", label: "Role", labelHidden: true, value: row.role, items: ROLE_ITEMS })}${ui.button({ label: "Apply", size: "sm", type: "submit" })}`) },
        { key: "disabled_at", label: "State", render: (row) => row.disabled_at ? ui.badge({ label: "disabled", variant: "neutral" }) : row.seen ? ui.badge({ label: "signed in", variant: "success" }) : ui.badge({ label: "active", variant: "neutral" }) },
        { key: "password", label: "Password", render: (row) => post(row.id, "password", `${ui.input({ name: "password", type: "password", placeholder: "New password", autocomplete: "new-password", ariaLabel: `New password for ${row.login}`, size: "sm", required: true })}${ui.button({ label: "Set", size: "sm", type: "submit" })}`) },
        { key: "id", label: "", render: (row) => ui.hStack({ gap: 2, align: "center", body: [
            row.disabled_at
                ? post(row.id, "enable", ui.button({ label: "Enable", size: "sm", type: "submit" }))
                : post(row.id, "disable", ui.button({ label: "Disable", size: "sm", variant: "destructive", type: "submit" }), `Disable ${row.login}? Their sessions end now.`),
            row.seen && !row.disabled_at ? post(row.id, "signout", ui.button({ label: "Sign out", size: "sm", variant: "ghost", type: "submit" })) : "",
        ].join("") }) },
    ], rows, empty: "No accounts" });

    const form = `<form class="asx-form grid gap-3" method="post" action="/_control/users">
        ${ctx.fns.bot.input({ name: "login", label: "Login", placeholder: "anna", required: true })}
        ${ctx.fns.bot.input({ name: "name", label: "Name", placeholder: "Anna Petrova" })}
        ${ui.selector({ name: "role", label: "Role", value: "editor", items: ROLE_ITEMS })}
        ${ctx.fns.bot.input({ name: "password", label: "Password", type: "password", placeholder: "At least 8 characters", required: true })}
        <div>${ui.button({ label: "Create account", variant: "primary", type: "submit" })}</div>
    </form>`;

    const main = `${notice ? ui.banner({ tone, title: notice }) : ""}${ui.card({ body: table })}${ui.card({ title: "New account", description: "Pass the password on yourself; they can change it at /_auth/password.", body: form })}`;
    return ctx.fns.bot.screen({ page: "team", title: "Team", lead: "Who can sign in to this admin, and what they may do.", main });
}
