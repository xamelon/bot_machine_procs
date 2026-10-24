import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { testCtx } from "../$test";

// The machine's own git identity must not leak into the scratch repository.
process.env.GIT_CONFIG_GLOBAL = "/dev/null";
process.env.GIT_CONFIG_NOSYSTEM = "1";

const as = (role: string) => ({ "x-bot-user": encodeURIComponent(JSON.stringify({ id: "u1", login: "anna", name: "Anna", role })) });
const run = (cwd: string, ...args: string[]) => {
    const r = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
    if (r.exitCode !== 0) throw new Error(r.stderr.toString());
    return r.stdout.toString().trim();
};
const form = (fields: Record<string, string>) => {
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.set(k, v);
    return body;
};

let dir: string, app: string, origin: string, ctx: Context;
beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "repo-test-"));
    app = join(dir, "app"); origin = join(dir, "origin.git");
    mkdirSync(join(app, "src/core"), { recursive: true });
    run(dir, "init", "--quiet", "--bare", "--initial-branch=main", origin);
    run(app, "init", "--quiet", "--initial-branch=main");
    run(app, "config", "user.name", "Test"); run(app, "config", "user.email", "test@example.com");
    writeFileSync(join(app, ".gitignore"), ".runtime/\n");
    writeFileSync(join(app, ".gitmodules"), '[submodule "core"]\n\tpath = src/core\n\turl = git@github.com:x/core.git\n');
    writeFileSync(join(app, "src/a.ts"), "export default 1;\n");
    run(app, "add", "-A"); run(app, "commit", "--quiet", "-m", "init");
    ctx = await testCtx();
    ctx.state.repo = { root: app };
});
afterAll(() => { ctx.fns.procs.db.close({}); rmSync(dir, { recursive: true, force: true }); });

test("github names: any usual spelling, nothing else", () => {
    const ssh = "git@github.com:xamelon/kalyan_bot.git";
    for (const url of ["xamelon/kalyan_bot", "github.com/xamelon/kalyan_bot", "https://github.com/xamelon/kalyan_bot", "https://github.com/xamelon/kalyan_bot.git/", ssh, "ssh://git@github.com/xamelon/kalyan_bot.git"]) {
        expect(ctx.fns.repo.github({ url })?.ssh).toBe(ssh);
    }
    for (const url of ["", "https://gitlab.com/a/b", "git@evil.com:a/b.git", "a/b/c", "a/..", "-o/x", "https://github.com.evil.com/a/b"]) {
        expect(ctx.fns.repo.github({ url })).toBeNull();
    }
});

test("only admins see the page and may act", async () => {
    for (const role of ["editor", "viewer"]) {
        expect((await ctx.fns.procs.http.dispatch({ url: "/repo", headers: as(role) })).status).toBe(403);
        expect((await ctx.fns.procs.http.dispatch({ url: "/repo/push", method: "POST", headers: as(role) })).status).toBe(403);
    }
    const html = await (await ctx.fns.procs.http.dispatch({ url: "/repo", headers: as("admin") })).text();
    expect(html).toContain("Connect GitHub");
    expect(html).toContain('action="/repo/connect"');
});

test("connect writes a deploy key, a GitHub origin and the ssh command for it", async () => {
    const res = await ctx.fns.procs.http.dispatch({ url: "/repo/connect", method: "POST", headers: as("admin"), body: form({ url: "https://github.com/xamelon/kalyan_bot" }) });
    expect(res.status).toBe(303);
    expect(decodeURIComponent(res.headers.get("location")!)).toContain("Connected to xamelon/kalyan_bot");
    expect(run(app, "remote", "get-url", "origin")).toBe("git@github.com:xamelon/kalyan_bot.git");
    const ssh = run(app, "config", "core.sshCommand");
    expect(ssh).toContain(join(app, ".runtime/git/id_ed25519"));
    expect(ssh).toContain("StrictHostKeyChecking=yes");
    expect(statSync(join(app, ".runtime/git/id_ed25519")).mode & 0o777).toBe(0o600);
    expect(statSync(join(app, ".runtime/git")).mode & 0o777).toBe(0o700);
    const html = await (await ctx.fns.procs.http.dispatch({ url: "/repo", headers: as("admin") })).text();
    expect(html).toContain("ssh-ed25519 ");
    expect(html).toContain("https://github.com/xamelon/kalyan_bot/settings/keys/new");
    expect(html).not.toContain("PRIVATE KEY");
    // A second connect keeps the same key.
    const key = await Bun.file(join(app, ".runtime/git/id_ed25519.pub")).text();
    await ctx.fns.repo.connect({ url: "xamelon/kalyan_bot" });
    expect(await Bun.file(join(app, ".runtime/git/id_ed25519.pub")).text()).toBe(key);

    const bad = await ctx.fns.procs.http.dispatch({ url: "/repo/connect", method: "POST", headers: as("admin"), body: form({ url: "git@evil.com:a/b.git" }) });
    expect(decodeURIComponent(bad.headers.get("location")!)).toContain("tone=error");
    expect(run(app, "remote", "get-url", "origin")).toBe("git@github.com:xamelon/kalyan_bot.git");
});

test("commit takes everything but submodules; push sends the branch", async () => {
    writeFileSync(join(app, "src/a.ts"), "export default 2;\n");
    writeFileSync(join(app, "src/b.ts"), "export default 3;\n");
    writeFileSync(join(app, "src/core/x.ts"), "core\n");
    const page = await (await ctx.fns.procs.http.dispatch({ url: "/repo", headers: as("admin") })).text();
    expect(page).toContain("src/b.ts");
    expect(page).toContain("Commit 2 files");

    expect(decodeURIComponent((await ctx.fns.procs.http.dispatch({ url: "/repo/commit", method: "POST", headers: as("admin"), body: form({ message: " " }) })).headers.get("location")!)).toContain("Write a commit message");
    const res = await ctx.fns.procs.http.dispatch({ url: "/repo/commit", method: "POST", headers: as("admin"), body: form({ message: "Change a, add b" }) });
    expect(decodeURIComponent(res.headers.get("location")!)).toContain("Committed");
    expect(run(app, "log", "-1", "--format=%s")).toBe("Change a, add b");
    expect(run(app, "show", "--name-only", "--format=", "HEAD").split("\n").sort()).toEqual(["src/a.ts", "src/b.ts"]);
    expect(run(app, "status", "--porcelain")).toBe("?? src/core/");
    await expect(ctx.fns.repo.commit({ message: "again" })).rejects.toThrow("Nothing to commit");

    // A local origin stands in for GitHub: the push path is the same.
    run(app, "remote", "set-url", "origin", origin);
    const pushed = await ctx.fns.procs.http.dispatch({ url: "/repo/push", method: "POST", headers: as("admin") });
    expect(decodeURIComponent(pushed.headers.get("location")!)).toContain("Pushed main");
    expect(run(origin, "log", "-1", "--format=%s", "main")).toBe("Change a, add b");
    const status = await ctx.fns.repo.status({});
    expect(status.repo && status.upstream).toBe("origin/main");
});

test("a commit without a configured identity is the signed-in operator's", async () => {
    run(app, "config", "--unset", "user.email");
    run(app, "config", "--unset", "user.name");
    writeFileSync(join(app, "src/c.ts"), "export default 4;\n");
    const res = await ctx.fns.procs.http.dispatch({ url: "/repo/commit", method: "POST", headers: as("admin"), body: form({ message: "By Anna" }) });
    expect(decodeURIComponent(res.headers.get("location")!)).toContain("Committed");
    expect(run(app, "log", "-1", "--format=%an <%ae>")).toBe("Anna <anna@bot.local>");
});

test("a folder that is not a checkout of its own is refused", async () => {
    const inner = join(app, "src");
    const other = await testCtx();
    try {
        other.state.repo = { root: inner };
        expect((await other.fns.repo.status({})).repo).toBe(false);
        const html = await (await other.fns.procs.http.dispatch({ url: "/repo", headers: as("admin") })).text();
        expect(html).toContain("Not a Git repository");
    } finally { other.fns.procs.db.close({}); }
});
