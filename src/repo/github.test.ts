import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { testCtx } from "../$test";

// No real GitHub: the machine's git identity stays out, and ssh fails at once
// instead of dialling github.com.
process.env.GIT_CONFIG_GLOBAL = "/dev/null";
process.env.GIT_CONFIG_NOSYSTEM = "1";
process.env.GIT_SSH_COMMAND = "false";

const TOKEN = "gho_secret_test_token";
const as = (role: string) => ({ "x-bot-user": encodeURIComponent(JSON.stringify({ id: "u1", login: "anna", name: "Anna", role })) });
const run = (cwd: string, ...args: string[]) => {
    const r = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
    if (r.exitCode !== 0) throw new Error(r.stderr.toString());
    return r.stdout.toString().trim();
};
const form = (fields: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.set(k, v); return f; };
const notice = (res: Response) => decodeURIComponent(res.headers.get("location") ?? "");

// A fake GitHub: the device flow on the site, the REST API under /api.
const fake = { polls: 0, created: [] as any[], keys: {} as Record<string, any[]>, seen: [] as string[] };
let server: ReturnType<typeof Bun.serve>;
let dir: string, app: string, ctx: Context;

beforeAll(async () => {
    server = Bun.serve({ port: 0, async fetch(req) {
        const url = new URL(req.url);
        fake.seen.push(`${req.method} ${url.pathname}`);
        if (url.pathname === "/login/device/code") {
            const body = new URLSearchParams(await req.text());
            if (body.get("client_id") !== "Iv1.test" || body.get("scope") !== "repo") return Response.json({ error: "incorrect_client_credentials" });
            return Response.json({ device_code: "dev-1", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 5 });
        }
        if (url.pathname === "/login/oauth/access_token") {
            const body = new URLSearchParams(await req.text());
            if (body.get("device_code") !== "dev-1") return Response.json({ error: "incorrect_device_code" });
            return Response.json(++fake.polls === 1 ? { error: "authorization_pending" } : { access_token: TOKEN, token_type: "bearer", scope: "repo" });
        }
        if (req.headers.get("authorization") !== `Bearer ${TOKEN}`) return Response.json({ message: "Bad credentials" }, { status: 401 });
        const api = url.pathname.replace(/^\/api/, "");
        if (api === "/user") return Response.json({ login: "anna" });
        if (api === "/user/repos" && req.method === "GET") return Response.json([
            { full_name: "anna/bot", private: true, permissions: { admin: true }, pushed_at: null, size: 0 },
            { full_name: "other/readonly", private: false, permissions: { admin: false, push: true }, pushed_at: "2026-01-01", size: 10 },
        ]);
        if (api === "/user/repos" && req.method === "POST") { const b: any = await req.json(); fake.created.push(b); return Response.json({ full_name: `anna/${b.name}` }, { status: 201 }); }
        const keys = api.match(/^\/repos\/([^/]+\/[^/]+)\/keys$/);
        if (keys) {
            const list = (fake.keys[keys[1]!] ??= []);
            if (req.method === "GET") return Response.json(list);
            const b: any = await req.json();
            list.push({ id: list.length + 1, ...b });
            return Response.json(list.at(-1), { status: 201 });
        }
        return Response.json({ message: "Not Found" }, { status: 404 });
    } });
    dir = mkdtempSync(join(tmpdir(), "repo-github-"));
    app = join(dir, "kalyan_bot");
    Bun.spawnSync(["mkdir", "-p", app]);
    run(app, "init", "--quiet", "--initial-branch=main");
    writeFileSync(join(app, ".gitignore"), ".runtime/\n");
    const base = `http://127.0.0.1:${server.port}`;
    ctx = await testCtx({ env: { GITHUB_CLIENT_ID: "Iv1.test", REPO_GITHUB_URL: base, REPO_GITHUB_API: `${base}/api` } });
    ctx.state.repo = { root: app };
});
afterAll(() => { ctx.fns.procs.db.close({}); server.stop(true); rmSync(dir, { recursive: true, force: true }); });

test("with an OAuth App, Connect GitHub signs in; editors cannot", async () => {
    const page = await (await ctx.fns.procs.http.dispatch({ url: "/repo", headers: as("admin") })).text();
    expect(page).toContain('action="/repo/github/start"');
    expect(page).toContain('action="/repo/connect"'); // by hand, still there
    expect((await ctx.fns.procs.http.dispatch({ url: "/repo/github/start", method: "POST", headers: as("editor") })).status).toBe(403);
});

test("sign in with a device code, pick a repository, get its deploy key added, forget the token", async () => {
    expect(notice(await ctx.fns.procs.http.dispatch({ url: "/repo/github/start", method: "POST", headers: as("admin") }))).toContain("Enter ABCD-1234 on GitHub");
    let page = await (await ctx.fns.procs.http.dispatch({ url: "/repo", headers: as("admin") })).text();
    expect(page).toContain("ABCD-1234");
    expect(page).toContain("https://github.com/login/device");
    expect(page).toContain('action="/repo/github/check"');

    // Not entered yet, then entered.
    const early = notice(await ctx.fns.procs.http.dispatch({ url: "/repo/github/check", method: "POST", headers: as("admin") }));
    expect(early).toContain("tone=error");
    expect(early).toContain("has not confirmed yet");
    expect(notice(await ctx.fns.procs.http.dispatch({ url: "/repo/github/check", method: "POST", headers: as("admin") }))).toContain("Signed in to GitHub as anna");

    page = await (await ctx.fns.procs.http.dispatch({ url: "/repo", headers: as("admin") })).text();
    expect(page).toContain("signed in as anna");
    expect(page).toContain("anna/bot");
    expect(page).not.toContain("other/readonly"); // no admin rights there: a key cannot be added
    expect(page).not.toContain(TOKEN);

    const used = notice(await ctx.fns.procs.http.dispatch({ url: "/repo/github/use", method: "POST", headers: as("admin"), body: form({ repo: "anna/bot" }) }));
    expect(used).toContain("Connected to anna/bot");
    expect(run(app, "remote", "get-url", "origin")).toBe("git@github.com:anna/bot.git");
    const pub = (await Bun.file(join(app, ".runtime/git/id_ed25519.pub")).text()).trim();
    expect(fake.keys["anna/bot"]).toEqual([{ id: 1, title: expect.stringContaining("kalyan_bot admin"), key: pub, read_only: false }]);
    expect(ctx.state.repo?.github).toBeUndefined();

    // The token is gone: using it again needs a new sign-in.
    expect(notice(await ctx.fns.procs.http.dispatch({ url: "/repo/github/use", method: "POST", headers: as("admin"), body: form({ repo: "anna/bot" }) }))).toContain("Sign in to GitHub first");
    page = await (await ctx.fns.procs.http.dispatch({ url: "/repo", headers: as("admin") })).text();
    expect(page).toContain('href="https://github.com/anna/bot"');
});

test("the same repository keeps its key and is not given it twice; a new one gets a new key", async () => {
    const before = (await Bun.file(join(app, ".runtime/git/id_ed25519.pub")).text()).trim();
    const signIn = async () => {
        fake.polls = 1; // the next poll is the confirmed one
        await ctx.fns.procs.http.dispatch({ url: "/repo/github/start", method: "POST", headers: as("admin") });
        await ctx.fns.procs.http.dispatch({ url: "/repo/github/check", method: "POST", headers: as("admin") });
    };
    await signIn();
    await ctx.fns.procs.http.dispatch({ url: "/repo/github/use", method: "POST", headers: as("admin"), body: form({ repo: "anna/bot" }) });
    expect(fake.keys["anna/bot"]).toHaveLength(1);
    expect((await Bun.file(join(app, ".runtime/git/id_ed25519.pub")).text()).trim()).toBe(before);

    await signIn();
    const res = notice(await ctx.fns.procs.http.dispatch({ url: "/repo/github/use", method: "POST", headers: as("admin"), body: form({ create: "newbot", visibility: "private" }) }));
    expect(res).toContain("Connected to anna/newbot");
    expect(fake.created).toEqual([{ name: "newbot", private: true, auto_init: false }]);
    const after = (await Bun.file(join(app, ".runtime/git/id_ed25519.pub")).text()).trim();
    expect(after).not.toBe(before);
    expect(fake.keys["anna/newbot"]?.[0]?.key).toBe(after);
    expect(run(app, "remote", "get-url", "origin")).toBe("git@github.com:anna/newbot.git");
});

test("a bad name keeps the sign-in for another try; cancel and expiry forget it", async () => {
    fake.polls = 1;
    await ctx.fns.procs.http.dispatch({ url: "/repo/github/start", method: "POST", headers: as("admin") });
    await ctx.fns.procs.http.dispatch({ url: "/repo/github/check", method: "POST", headers: as("admin") });
    expect(notice(await ctx.fns.procs.http.dispatch({ url: "/repo/github/use", method: "POST", headers: as("admin"), body: form({ create: "no spaces" }) }))).toContain("tone=error");
    expect(ctx.state.repo?.github?.token).toBe(TOKEN);
    await ctx.fns.procs.http.dispatch({ url: "/repo/github/cancel", method: "POST", headers: as("admin") });
    expect(ctx.state.repo?.github).toBeUndefined();

    await ctx.fns.procs.http.dispatch({ url: "/repo/github/start", method: "POST", headers: as("admin") });
    ctx.state.repo!.github!.expiresAt = Date.now() - 1;
    expect(ctx.fns.repo.signInState({})).toBeNull();
    expect(ctx.state.repo?.github).toBeUndefined();
});

test("without an OAuth App the page offers the manual way only", async () => {
    const bare = await testCtx();
    try {
        bare.state.repo = { root: app };
        run(app, "remote", "remove", "origin");
        const page = await (await bare.fns.procs.http.dispatch({ url: "/repo", headers: as("admin") })).text();
        expect(page).not.toContain('action="/repo/github/start"');
        expect(page).toContain('action="/repo/connect"');
        expect(notice(await bare.fns.procs.http.dispatch({ url: "/repo/github/start", method: "POST", headers: as("admin") }))).toContain("No GitHub OAuth App");
    } finally { bare.fns.procs.db.close({}); }
});
