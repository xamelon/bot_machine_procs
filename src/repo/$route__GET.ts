// The bot's own Git checkout, for admins: connect it to GitHub with a deploy
// key, see what changed, commit and push. Deliberately minimal — anything more
// (diffs, pulls, merges, branches) is the agent's job through its repl, and the
// connection set up here is what lets that agent push too.
const LABELS: Record<string, string> = { M: "modified", A: "added", D: "deleted", R: "renamed", C: "copied", U: "conflict", "?": "new", T: "type changed" };

export default async function (ctx: Context, session: Session | null, _opts: {}) {
    const ui = ctx.fns.procs.ui;
    if (!ctx.fns.team.can({ permission: "repo.manage" })) return { title: "Repository", status: 403, main: ui.emptyState({ title: "Admins only", body: "Ask an admin to commit and push." }) };
    const esc = (s: any) => ui.escape({ text: s });
    const url = session?.req ? new URL(session.req.url) : null;
    const notice = url?.searchParams.get("notice") ?? "";
    const tone = url?.searchParams.get("tone") === "error" ? "error" : "success";
    const screen = (main: string) => ctx.fns.bot.screen({ page: "repo", title: "Repository", lead: "This bot's code on GitHub: commit and push what was changed here.", main: `${notice ? ui.banner({ tone, title: notice }) : ""}${main}` });

    const s = await ctx.fns.repo.status({});
    if (!s.repo) return screen(ui.emptyState({ title: "Not a Git repository", body: `${s.root} is not a Git checkout of its own, so there is nothing to commit here.` }));

    const post = (action: string, body: string) => `<form method="post" action="/repo/${action}">${body}</form>`;
    const connectForm = (value: string, label: string) => post("connect", ui.hStack({ gap: 2, align: "end", body: `<div class="grow">${ctx.fns.bot.input({ name: "url", label: "Repository", value, placeholder: "owner/repo or git@github.com:owner/repo.git", required: true })}</div>${ui.button({ label, variant: s.github ? "secondary" : "primary", icon: "ph-github-logo", type: "submit" })}` }));

    let github: string;
    if (!s.github || !s.key) {
        github = ui.card({ title: "GitHub", description: s.remote ? `origin is ${s.remote}, not a GitHub repository this page can push to.` : "Not connected. Create an empty repository on GitHub (or use an existing one) and name it here.", body: connectForm(s.github?.ssh ?? "", "Connect GitHub") });
    } else {
        const steps = `<ol class="grid gap-1 list-decimal pl-5">
            <li>Open ${ui.link({ href: `${s.github.web}/settings/keys/new`, label: "Deploy keys → Add deploy key", external: true })} on GitHub.</li>
            <li>Paste the key below, tick <strong>Allow write access</strong>, save.</li>
            <li>Press <strong>Check connection</strong>.</li></ol>`;
        github = ui.card({ title: "GitHub", body: `<div class="grid gap-4">
            ${ui.metadataList({ items: [
                { label: "Repository", value: ui.link({ href: s.github.web, label: `${s.github.owner}/${s.github.name}`, external: true }) },
                { label: "Branch", value: `${esc(s.branch || "—")}${s.upstream ? ` → ${esc(s.upstream)}` : ` ${ui.badge({ label: "not pushed yet", variant: "neutral" })}`}${s.ahead ? ` ${ui.badge({ label: `${s.ahead} to push`, variant: "info" })}` : ""}${s.behind ? ` ${ui.badge({ label: `${s.behind} behind`, variant: "warning" })}` : ""}` },
            ] })}
            ${steps}
            ${ui.codeBlock({ code: s.key, language: "Deploy key (public)" })}
            ${ui.hStack({ gap: 2, align: "center", body: post("check", ui.button({ label: "Check connection", type: "submit" })) })}
            <details><summary>${ui.text({ text: "Another repository", tone: "secondary", size: "supporting" })}</summary><div class="pt-3">${connectForm(s.github.ssh, "Reconnect")}</div></details>
        </div>` });
    }

    const own = s.files.filter(file => !file.submodule);
    const label = (code: string) => {
        const c = code.trim()[0] ?? "";
        return LABELS[code.includes("U") ? "U" : c] ?? code;
    };
    const table = ui.table({ columns: [
        { key: "code", label: "", render: (f) => ui.badge({ label: label(f.code), variant: f.submodule ? "neutral" : f.code.includes("D") ? "error" : f.code === "??" ? "success" : "info" }) },
        { key: "path", label: "File", wrap: true, render: (f) => `<code>${esc(f.path)}</code>${f.from ? ui.text({ text: `from ${f.from}`, tone: "secondary", size: "supporting", as: "div" }) : ""}${f.submodule ? ui.text({ text: "Submodule (shared core): not committed from here", tone: "secondary", size: "supporting", as: "div" }) : ""}` },
    ], rows: s.files, empty: "No changes" });
    const commit = own.length
        ? post("commit", `<div class="grid gap-3">${ui.textarea({ name: "message", label: "Commit message", rows: 2, placeholder: "What changed and why", required: true })}<div>${ui.button({ label: `Commit ${own.length} file${own.length === 1 ? "" : "s"}`, variant: "primary", type: "submit" })}</div></div>`)
        : "";
    const push = s.github && s.key && (s.ahead > 0 || !s.upstream)
        ? post("push", ui.button({ label: s.ahead ? `Push ${s.ahead} commit${s.ahead === 1 ? "" : "s"}` : "Push", variant: own.length ? "secondary" : "primary", icon: "ph-upload-simple", type: "submit" }))
        : "";
    const changes = ui.card({ title: "Changes", description: own.length ? "Everything below except submodules goes into one commit." : "Nothing to commit.", body: `<div class="grid gap-4">${table}${commit}${push}</div>` });

    return screen(`<div class="grid gap-4">${github}${changes}</div>`);
}
