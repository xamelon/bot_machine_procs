import { test, expect } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("supervisor protects control APIs and recovery survives runtime death", async () => {
    const root = await mkdtemp(join(tmpdir(), "procs-host-"));
    const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
    const port = probe.port!; probe.stop(true);
    await mkdir(join(root, "src"));
    // A mounted app has no bootstrap or core checkout. Its middleware stands in
    // for pages and echoes forwarded headers; the real core boots and serves it.
    await Bun.write(join(root, "package.json"), JSON.stringify({ procs: { prod: { "procs/http": {} } } }));
    await Bun.write(join(root, "src/$middleware.ts"), 'export default function (_ctx, _session, { req }) { return new URL(req.url).pathname.endsWith("/whoami") ? Response.json({ user: req.headers.get("x-bot-user"), access: req.headers.get("x-bot-access"), cookie: req.headers.get("cookie"), authorization: req.headers.get("authorization") }) : new Response("runtime"); }');
    // `CONTROL_AUTH=open` in a developer's .env turns the login off for a tunnel
    // measurement. A test about that login must not inherit it: the switch is
    // deleted here, so the child is a supervisor with its door shut whatever the
    // machine is set up for.
    const env = { ...process.env, APP_ROOT: root, PORT: String(port), WATCH: "0", PROCS_PLUGINS: "", PROCS_PATH: "", CONTROL_PASSWORD: "test-password", OPENAI_API_KEY: "", PUBLIC_BASE_URL: "https://bot.example.test/" };
    delete (env as any).CONTROL_AUTH;
    const proc = Bun.spawn([process.execPath, join(import.meta.dir, "start.ts")], { cwd: root, env, stdout: "ignore", stderr: "ignore" });
    const base = `http://127.0.0.1:${port}`;
    const signIn = (login: string, password: string, next = "/bot") => fetch(base + "/_auth/login", {
        method: "POST", redirect: "manual",
        headers: { origin: base, "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ login, password, next }),
    });
    const cookieOf = (res: Response) => res.headers.get("set-cookie")?.split(";")[0] ?? "";
    let headers: Record<string, string> = {};
    try {
        let ready = false;
        for (let i = 0; i < 60; i++) {
            try {
                const res = await signIn("admin", "test-password");
                if (res.status === 303) {
                    headers = { cookie: cookieOf(res) };
                    ready = (await fetch(base + "/_agent/state", { headers })).status === 200
                        && await (await fetch(base, { headers })).text() === "runtime";
                }
                if (ready) break;
            } catch {}
            await Bun.sleep(100);
        }
        expect(ready).toBe(true);
        // The first start created `admin` from CONTROL_PASSWORD; Basic auth is gone.
        expect((await fetch(base + "/_agent/state")).status).toBe(401);
        expect((await fetch(base + "/_agent/state", { headers: { authorization: `Basic ${btoa("admin:test-password")}` } })).status).toBe(401);
        const page = await fetch(base + "/bot/channels?x=1", { redirect: "manual", headers: { accept: "text/html" } });
        expect(page.status).toBe(303);
        expect(page.headers.get("location")).toBe("/_auth/login?next=%2Fbot%2Fchannels%3Fx%3D1");
        expect((await fetch(base + "/bot/inbox", { headers: { "hx-request": "true" } })).headers.get("hx-redirect")).toStartWith("/_auth/login");
        // The sign-in page is Astryx without the runtime: its tokens, component
        // rules and typeface come from the core's sources.
        const loginHtml = await (await fetch(base + "/_auth/login")).text();
        expect(loginHtml).toContain('class="asx-button" data-variant="primary"');
        expect(loginHtml).toContain("--color-asx-accent:");
        expect(loginHtml).toContain("/_auth/font/cyrillic.woff2");
        const font = await fetch(base + "/_auth/font/cyrillic.woff2");
        expect(font.headers.get("content-type")).toBe("font/woff2");
        expect((await font.arrayBuffer()).byteLength).toBeGreaterThan(1000);
        expect((await fetch(base + "/_auth/font/passwd.woff2")).status).toBe(404);
        expect((await fetch(base + "/_auth/font/..%2F..%2Fpackage.json")).status).toBe(404);
        expect((await signIn("admin", "wrong-password")).status).toBe(401);
        // Login is a form post like any other: a foreign Origin cannot sign a browser in.
        expect((await fetch(base + "/_auth/login", { method: "POST", headers: { origin: "https://evil.example" }, body: new URLSearchParams({ login: "admin", password: "test-password" }) })).status).toBe(403);
        // Only a same-site path may follow a login.
        expect((await signIn("admin", "test-password", "//evil.example/")).headers.get("location")).toBe("/");
        const signedIn = await signIn("admin", "test-password");
        expect(signedIn.headers.get("set-cookie")).toContain("HttpOnly");
        expect(signedIn.headers.get("set-cookie")).toContain("SameSite=Lax");
        // The runtime learns who is asking, never the session token, and a
        // client cannot claim to be someone else.
        const seen = await (await fetch(base + "/whoami", { headers: { cookie: `${headers.cookie}; theme=dark`, "x-bot-user": "forged" } })).json();
        expect(JSON.parse(decodeURIComponent(seen.user))).toMatchObject({ login: "admin", role: "admin" });
        expect(seen.cookie).toBe("theme=dark");
        expect(seen.authorization).toBeNull();
        expect(seen.access).toBeNull();
        // A client cannot mark itself public on a private path either.
        expect((await (await fetch(base + "/whoami", { headers: { ...headers, "x-bot-access": "public" } })).json()).access).toBeNull();

        // Public paths (`/<module>/public/…`): no sign-in, no Origin — a provider's
        // webhook — and anonymous even for a signed-in admin.
        const anon = await fetch(base + "/app/public/whoami");
        expect(anon.status).toBe(200);
        expect(await anon.json()).toMatchObject({ user: null, access: "public" });
        const hook = await fetch(base + "/app/public/whoami", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
        expect(hook.status).toBe(200);
        const adminThere = await (await fetch(base + "/app/public/whoami", { headers })).json();
        expect(adminThere).toMatchObject({ user: null, access: "public", cookie: null });
        expect((await fetch(base + "/bot/webhook/whoami", { method: "POST", body: "{}" })).status).toBe(200);
        // Underscore namespaces are never public, nor is anything that merely contains "public".
        for (const path of ["/_agent/public/state", "/_control/public/status", "/app/publicity", "/app/x/public/y"]) {
            expect((await fetch(base + path)).status).toBe(401);
        }
        // The framework's static files are readable without signing in, but only read.
        expect(await (await fetch(base + "/procs/ui/core.css")).text()).toBe("runtime");
        expect(await (await fetch(base + "/procs/styles/font/cyrillic.woff2")).text()).toBe("runtime");
        expect((await fetch(base + "/procs/ui/core.css", { method: "POST", body: "" })).status).toBe(403);
        expect((await fetch(base + "/procs/ui")).status).toBe(401);

        // Accounts: an admin creates an editor and a viewer through /_control/users.
        const control = (path: string, body: unknown, as = headers) => fetch(base + path, { method: "POST", headers: { ...as, origin: base, "content-type": "application/json" }, body: JSON.stringify(body) });
        expect((await control("/_control/users", { login: "ed", name: "Ed", role: "editor", password: "editor-pass" })).status).toBe(200);
        expect((await control("/_control/users", { login: "vi", role: "viewer", password: "viewer-pass" })).status).toBe(200);
        expect((await control("/_control/users", { login: "short", role: "viewer", password: "123" })).status).toBe(400);
        const accounts = await (await fetch(base + "/_control/users", { headers })).json();
        expect(accounts.map((u: any) => u.login)).toEqual(["admin", "ed", "vi"]);
        expect(JSON.stringify(accounts)).not.toContain("password");
        const editor = { cookie: cookieOf(await signIn("ed", "editor-pass")) };
        const viewer = { cookie: cookieOf(await signIn("vi", "viewer-pass")) };
        // Editor: the bot admin, including writes, but not the agent, recovery or accounts.
        expect((await fetch(base + "/bot/channels", { method: "POST", headers: { ...editor, origin: base }, body: "" })).status).toBe(200);
        expect((await fetch(base + "/_agent/state", { headers: editor })).status).toBe(403);
        expect((await fetch(base + "/_control/status", { headers: editor })).status).toBe(403);
        expect((await control("/_control/users", { login: "x", role: "admin", password: "12345678" }, editor)).status).toBe(403);
        // Viewer: read only.
        expect(await (await fetch(base + "/bot/channels", { headers: viewer })).text()).toBe("runtime");
        expect((await fetch(base + "/bot/channels", { method: "POST", headers: { ...viewer, origin: base }, body: "" })).status).toBe(403);
        // Disabling a user ends their sessions at once; the last admin is protected.
        const ed = accounts.find((u: any) => u.login === "ed");
        expect((await control(`/_control/users/${ed.id}/disable`, {})).status).toBe(200);
        expect((await fetch(base + "/bot/channels", { headers: editor })).status).toBe(401);
        expect((await signIn("ed", "editor-pass")).status).toBe(401);
        const admin = accounts.find((u: any) => u.login === "admin");
        expect((await control(`/_control/users/${admin.id}/role`, { role: "viewer" })).status).toBe(400);
        // Signing out ends that session only.
        expect((await fetch(base + "/_auth/logout", { method: "POST", redirect: "manual", headers: { ...viewer, origin: base } })).status).toBe(303);
        expect((await fetch(base + "/bot/channels", { headers: viewer })).status).toBe(401);
        expect((await fetch(base + "/bot/channels", { headers })).status).toBe(200);
        expect((await fetch(base + "/procs/repl", { headers })).status).toBe(403);
        expect((await fetch(base + "/_agent/submit", { headers, method: "POST", body: "{}" })).status).toBe(403);
        expect((await fetch(base + "/_agent/auth/login", { headers, method: "POST", body: "{}" })).status).toBe(403);
        // A TLS-terminating tunnel delivers HTTP locally, while the browser's
        // Origin remains HTTPS. Only the configured public origin is trusted.
        const channelPost = (extra: Record<string, string>) => fetch(base + "/bot/channels", { method: "POST", headers: { ...headers, ...extra }, body: "" });
        expect(await (await channelPost({ origin: "https://bot.example.test" })).text()).toBe("runtime");
        expect((await channelPost({ origin: base })).status).toBe(200);
        for (const origin of ["https://evil.example", "https://bot.example.test.evil.example", "http://bot.example.test", "null"]) {
            expect((await channelPost({ origin, "x-forwarded-host": new URL(origin === "null" ? "https://evil.example" : origin).host, "x-forwarded-proto": "https" })).status).toBe(403);
        }
        expect((await channelPost({})).status).toBe(403);
        const post = async (path: string, body: unknown) => fetch(base + path, { method: "POST", headers: { ...headers, origin: base, "content-type": "application/json" }, body: JSON.stringify(body) });
        await post("/_agent/auth/login", { providerId: "openai", type: "api_key" });
        await Bun.sleep(20);
        const login = (await (await fetch(base + "/_agent/auth", { headers })).json()).login;
        await post("/_agent/auth/respond", { id: login.id, promptId: login.prompt.id, value: "test-key-not-real" });
        await Bun.sleep(30);
        expect((await post("/_agent/model", { provider: "openai", modelId: "gpt-4.1" })).status).toBe(200);
        const status = await (await fetch(base + "/_control/status", { headers })).json();
        process.kill(status.agent.pid, "SIGTERM");
        await Bun.sleep(1800);
        const reopened = await (await fetch(base + "/_agent/state", { headers })).json();
        expect(reopened.configured).toBe(true);
        expect(reopened.model).toBe("gpt-4.1");
        expect((await post("/_agent/auth/logout", { providerId: "openai" })).status).toBe(200);
        process.kill(status.runtime.pid, "SIGKILL");
        expect((await fetch(base + "/_control/", { headers })).status).toBe(200);
        expect((await fetch(base + "/_agent/state", { headers })).status).toBe(200);
        await Bun.sleep(1800);
        expect(await (await fetch(base, { headers })).text()).toBe("runtime");
        // Clearing drops the message log only: the worker keeps its pid, the chosen
        // model and the provider login survive; nothing is deleted from storage.
        const before = (await (await fetch(base + "/_control/status", { headers })).json()).agent;
        const cleared = await post("/_agent/reset", {});
        expect(cleared.status).toBe(200);
        expect((await cleared.json()).ok).toBe(true);
        await Bun.sleep(100);
        const after = (await (await fetch(base + "/_control/status", { headers })).json()).agent;
        expect(after.pid).toBe(before.pid);
        const fresh = await (await fetch(base + "/_agent/state", { headers })).json();
        expect((fresh.entries ?? []).filter((entry: any) => entry.kind !== "pi.reset")).toEqual([]);
        expect(fresh.model).toBe("gpt-4.1");
        expect((await fetch(base + "/_agent/state")).status).toBe(401);
    } finally {
        proc.kill(); await proc.exited;
        await rm(root, { recursive: true, force: true });
    }
}, 30_000);
