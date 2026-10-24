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
    const signInReady = Boolean(ctx.fns.procs.config.resolve({ module: "repo" }).githubClientId);
    const manualForm = (value: string, label: string, primary: boolean) => post("connect", ui.hStack({ gap: 2, align: "end", body: `<div class="grow">${ctx.fns.bot.input({ name: "url", label: "Repository", value, placeholder: "owner/repo or git@github.com:owner/repo.git", required: true })}</div>${ui.button({ label, variant: primary ? "primary" : "secondary", icon: "ph-github-logo", type: "submit" })}` }));
    const signInButton = (label: string, primary: boolean) => post("github/start", ui.button({ label, variant: primary ? "primary" : "secondary", icon: "ph-github-logo", type: "submit" }));
    const cancel = post("github/cancel", ui.button({ label: "Cancel", variant: "ghost", type: "submit" }));
    // Sign-in first when it is set up; typing a repository and pasting the key
    // by hand stays available underneath, and is all there is without it.
    const connectChoices = (value: string, label: string) => signInReady
        ? `<div class="grid gap-3">${ui.hStack({ gap: 2, align: "center", body: signInButton(label, !s.github) })}<details><summary>${ui.text({ text: "Or name the repository and add the key yourself", tone: "secondary", size: "supporting" })}</summary><div class="pt-3">${manualForm(value, "Connect by hand", false)}</div></details></div>`
        : manualForm(value, label, !s.github);

    let github: string;
    const flow = ctx.fns.repo.signInState({});
    if (flow && !flow.token) {
        github = ui.card({ title: "Sign in to GitHub", body: `<div class="grid gap-4">
            <ol class="grid gap-1 list-decimal pl-5">
                <li>Open ${ui.link({ href: flow.verificationUri, label: flow.verificationUri, external: true })}.</li>
                <li>Enter this code and authorize: <strong class="text-lg tracking-widest"><code>${esc(flow.userCode)}</code></strong></li>
                <li>Come back and press <strong>Continue</strong>.</li></ol>
            ${ui.hStack({ gap: 2, align: "center", body: `${post("github/check", ui.button({ label: "Continue", variant: "primary", type: "submit" }))}${cancel}` })}
        </div>` });
    } else if (flow?.token) {
        let picker: string;
        try {
            const repos = await ctx.fns.repo.githubRepos({});
            picker = repos.length
                ? post("github/use", ui.hStack({ gap: 2, align: "end", body: `<div class="grow">${ui.selector({ name: "repo", label: "Repository", value: s.github ? `${s.github.owner}/${s.github.name}` : repos[0]!.fullName, items: repos.map(r => ({ label: r.fullName, value: r.fullName, description: `${r.private ? "private" : "public"}${r.empty ? ", empty" : ""}` })) })}</div>${ui.button({ label: "Use this repository", variant: "primary", type: "submit" })}` }))
                : ui.text({ text: "No repositories you administer. Create one below.", tone: "secondary", as: "div" });
        } catch (error: any) {
            picker = ui.banner({ tone: "error", title: String(error?.message ?? error) });
        }
        const bot = s.root.split("/").pop() || "bot";
        const create = post("github/use", ui.hStack({ gap: 2, align: "end", body: `<div class="grow">${ctx.fns.bot.input({ name: "create", label: "New repository", value: bot, required: true })}</div>${ui.selector({ name: "visibility", label: "Visibility", value: "private", items: [{ label: "Private", value: "private" }, { label: "Public", value: "public" }] })}${ui.button({ label: "Create and connect", type: "submit" })}` }));
        github = ui.card({ title: `GitHub: signed in as ${flow.login ?? "?"}`, description: "Pick where this bot's code goes. Its deploy key is added there, then this sign-in is forgotten.", body: `<div class="grid gap-4">${picker}${create}${ui.hStack({ gap: 2, align: "center", body: cancel })}</div>` });
    } else if (!s.github || !s.key) {
        github = ui.card({ title: "GitHub", description: s.remote ? `origin is ${s.remote}, not a GitHub repository this page can push to.` : signInReady ? "Not connected. Sign in to GitHub and pick a repository: the key is added for you." : "Not connected. Create an empty repository on GitHub (or use an existing one) and name it here.", body: connectChoices(s.github?.ssh ?? "", "Connect GitHub") });
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
            ${ui.hStack({ gap: 2, align: "center", body: post("check", ui.button({ label: "Check connection", type: "submit" })) })}
            <details><summary>${ui.text({ text: "Deploy key — if GitHub does not accept it, add it by hand", tone: "secondary", size: "supporting" })}</summary><div class="grid gap-3 pt-3">${steps}${ui.codeBlock({ code: s.key, language: "Deploy key (public)" })}</div></details>
            <details><summary>${ui.text({ text: "Another repository", tone: "secondary", size: "supporting" })}</summary><div class="pt-3">${connectChoices(s.github.ssh, "Connect another")}</div></details>
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
