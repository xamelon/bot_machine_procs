// Host entrypoint. Deliberately does not boot/scan the editable application.
import { resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import * as users from "./users";
import { loginPage, passwordPage, safeNext } from "./pages";
import { FONT_SUBSETS, fontFile } from "./design";
import { isPublic } from "./public";

// TLS may terminate at a tunnel/reverse proxy. Trust only our explicitly
// configured public origin, never arbitrary Forwarded/X-Forwarded-* headers.
const publicOrigin = process.env.PUBLIC_BASE_URL ? new URL(process.env.PUBLIC_BASE_URL).origin : null;
const root = resolve(process.env.APP_ROOT || process.cwd());
await mkdir(resolve(root, ".runtime/control"), { recursive: true });
const token = randomBytes(32).toString("hex");
const port = Number(process.env.PORT || 4100);
// Operator accounts live in the app database (supervisor/users.ts). The first
// start with no accounts creates `admin` with the operator password the
// supervisor has always used, so an existing installation signs in as before.
const db = users.open(users.databasePath(root));
const passwordPath = resolve(root, ".runtime/control/password");
if (users.count(db) === 0) {
    let password = process.env.CONTROL_PASSWORD;
    if (!password) {
        try { password = (await readFile(passwordPath, "utf8")).trim(); }
        catch { password = randomBytes(24).toString("hex"); await writeFile(passwordPath, password, { mode: 0o600 }); }
    }
    await users.create(db, { login: "admin", name: "Admin", role: "admin", password, bootstrap: true });
    console.log(`Supervisor: created user admin; password in ${passwordPath} (or CONTROL_PASSWORD). Change it at /_auth/password.`);
}
const COOKIE = "bot_session";
const failures = users.limiter();
const readToken = (req: Request) => new Bun.CookieMap(req.headers.get("cookie") ?? "").get(COOKIE);
// Secure whenever the browser is on HTTPS — including behind a TLS-terminating
// tunnel, where this process sees plain HTTP but the Host is the public one.
const secure = (req: Request, url: URL) => url.protocol === "https:" || (publicOrigin?.startsWith("https:") === true && req.headers.get("host") === new URL(publicOrigin).host);
const sessionCookie = (req: Request, url: URL, token: string) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? users.SESSION_DAYS * 86400 : 0}${secure(req, url) ? "; Secure" : ""}`;
const redirect = (location: string, cookie?: string) => new Response(null, { status: 303, headers: { location, "cache-control": "no-store", ...(cookie ? { "set-cookie": cookie } : {}) } });
async function form(req: Request): Promise<Record<string, string>> {
    try { return Object.fromEntries([...(await req.formData()).entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""])); }
    catch { return {}; }
}
// Only the session cookie is the supervisor's; the runtime and the agent get
// every other cookie but never the token.
function withoutSession(cookie: string | null) {
    return (cookie ?? "").split(/;\s*/).filter(part => part && !part.startsWith(`${COOKIE}=`)).join("; ");
}

// /_auth/*: sign in, sign out, change one's own password.
async function authRoute(req: Request, url: URL, ip: string): Promise<Response> {
    const path = url.pathname;
    // The interface typeface for these pages, from the core's assets. Matched
    // against the known subsets, never joined onto a path.
    const font = /^\/_auth\/font\/([a-z-]+)\.woff2$/.exec(path)?.[1];
    if (font && req.method === "GET") {
        if (!FONT_SUBSETS.includes(font)) return new Response("Not found", { status: 404 });
        return new Response(Bun.file(fontFile(font)), { headers: { "content-type": "font/woff2", "cache-control": "public, max-age=31536000, immutable" } });
    }
    const current = users.sessionUser(db, readToken(req));
    if (path === "/_auth/login" && req.method === "GET") {
        const next = safeNext(url.searchParams.get("next"));
        return current ? redirect(next) : loginPage({ next });
    }
    if (path === "/_auth/login" && req.method === "POST") {
        const body = await form(req);
        const next = safeNext(body.next), login = (body.login ?? "").trim();
        if (failures.locked(ip, login)) return loginPage({ next, login, error: "Too many attempts. Try again in 15 minutes.", status: 429 });
        const user = await users.verify(db, login, body.password);
        if (!user) { failures.fail(ip, login); return loginPage({ next, login, error: "Wrong login or password", status: 401 }); }
        failures.clear(ip, login);
        const token = users.startSession(db, user.id, { ip, userAgent: req.headers.get("user-agent") });
        return redirect(next, sessionCookie(req, url, token));
    }
    if (path === "/_auth/logout" && req.method === "POST") {
        users.endSession(db, readToken(req));
        return redirect("/_auth/login", sessionCookie(req, url, ""));
    }
    if (path === "/_auth/me" && req.method === "GET") {
        return current ? Response.json(current, { headers: { "cache-control": "no-store" } }) : Response.json({ error: "Sign in required" }, { status: 401 });
    }
    if (path === "/_auth/password") {
        if (!current) return redirect(`/_auth/login?next=${encodeURIComponent(path)}`);
        if (req.method === "GET") return passwordPage({ login: current.login });
        if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
        const body = await form(req);
        if (failures.locked(ip, current.login)) return passwordPage({ login: current.login, error: "Too many attempts. Try again in 15 minutes.", status: 429 });
        if (!(await users.verify(db, current.login, body.current))) { failures.fail(ip, current.login); return passwordPage({ login: current.login, error: "Current password is wrong", status: 400 }); }
        if (body.password !== body.repeat) return passwordPage({ login: current.login, error: "New passwords do not match", status: 400 });
        try { await users.setPassword(db, current.id, body.password); }
        catch (error) { if (error instanceof users.UserError) return passwordPage({ login: current.login, error: error.message, status: 400 }); throw error; }
        // Every session ended with the old password; this browser gets a new one.
        const token = users.startSession(db, current.id, { ip, userAgent: req.headers.get("user-agent") });
        return passwordPage({ login: current.login, done: true, headers: { "set-cookie": sessionCookie(req, url, token) } });
    }
    return new Response("Not found", { status: 404 });
}

// /_control/users*: account management for admins. Forms come from the app's
// Team page and go back there with a notice; JSON callers get JSON.
async function usersRoute(req: Request, url: URL, me: users.User | null, ip: string): Promise<Response> {
    const wantsJson = !(req.headers.get("content-type") ?? "").includes("form");
    if (url.pathname === "/_control/users" && req.method === "GET") return Response.json(users.list(db), { headers: { "cache-control": "no-store" } });
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const body = wantsJson ? await req.json().catch(() => ({})) : await form(req);
    const back = safeNext(body.back || "/team");
    const done = (notice: string, tone = "success", status = 200, cookie?: string) => wantsJson
        ? Response.json(tone === "success" ? { ok: true, notice } : { error: notice }, { status, headers: cookie ? { "set-cookie": cookie } : {} })
        : redirect(`${back}${back.includes("?") ? "&" : "?"}notice=${encodeURIComponent(notice)}&tone=${tone}`, cookie);
    const match = url.pathname.match(/^\/_control\/users(?:\/([a-f0-9]{16})\/(password|role|name|disable|enable|signout))?$/);
    if (!match) return new Response("Not found", { status: 404 });
    const [, id, action] = match;
    try {
        if (!id) {
            const user = await users.create(db, body);
            return done(`User ${user.login} created`);
        }
        const user = users.get(db, id);
        if (!user) return done("No such user", "error", 404);
        if (action === "password") {
            await users.setPassword(db, id, body.password);
            // Changing one's own password here signs this browser in again.
            const cookie = me?.id === id ? sessionCookie(req, url, users.startSession(db, id, { ip, userAgent: req.headers.get("user-agent") })) : undefined;
            return done(`Password for ${user.login} changed; their sessions were signed out`, "success", 200, cookie);
        }
        if (action === "role") { users.setRole(db, id, body.role); return done(`${user.login} is now ${body.role}`); }
        if (action === "name") { users.setName(db, id, body.name); return done(`${user.login} renamed`); }
        if (action === "disable") { users.setDisabled(db, id, true); return done(`${user.login} disabled`); }
        if (action === "enable") { users.setDisabled(db, id, false); return done(`${user.login} enabled`); }
        users.revokeAll(db, id);
        return done(`${user.login} signed out everywhere`);
    } catch (error) {
        if (error instanceof users.UserError) return done(error.message, "error", 400);
        throw error;
    }
}
const children: Record<string, any> = {};
let stopping = false;
function freePort() { const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() }); const p = server.port!; server.stop(true); return p; }
function spawn(name: string, entry: string) {
    const child = children[name] ??= { restarts: 0, port: freePort(), state: "starting" };
    child.state = "starting";
    child.started = Date.now();
    child.proc = Bun.spawn([process.execPath, entry], {
        cwd: root,
        env: { ...process.env, APP_ROOT: root, PORT: String(child.port), HTTP_HOST: "127.0.0.1", CONTROL_TOKEN: name === "agent" ? token : "" },
        stdin: "ignore", stdout: "inherit", stderr: "inherit",
        onExit() {
            child.state = "stopped";
            if (stopping) return;
            if (Date.now() - child.started > 60_000) child.restarts = 0;
            if (++child.restarts > 5) { child.state = "broken"; return; }
            child.timer = setTimeout(() => spawn(name, entry), Math.min(1000 * child.restarts, 5000));
        },
    });
    child.state = "running";
}
const runtimeEntry = resolve(import.meta.dir, "../src/$main.ts");
spawn("runtime", runtimeEntry);
spawn("agent", resolve(import.meta.dir, "agent.entry.ts"));

const assets = resolve(import.meta.dir, "recovery.html");
// `CONTROL_AUTH=open` turns the sign-in off for as long as the variable is
// set — for measuring what a visitor sees through a tunnel without a password in
// the way. It is loud on purpose: the line says so in the log, and it is a line
// in `.env`, so putting it back is a one-line edit rather than a memory.
const open = process.env.CONTROL_AUTH === "open";
if (open) console.log("Supervisor: CONTROL_AUTH=open — sign-in is OFF, do not leave this running");
// Roles: admin — everything, including the agent, recovery and accounts;
// editor — the whole bot admin, nothing under /_agent or /_control;
// viewer — the bot admin read-only (GET/HEAD).
const readOnly = (req: Request) => ["GET", "HEAD"].includes(req.method);
const server = Bun.serve({ hostname: process.env.SUPERVISOR_HOST || "127.0.0.1", port, idleTimeout: 120, async fetch(req, srv) {
    const url = new URL(req.url);
    // Public paths (supervisor/public.ts): anonymous, no sign-in, no Origin check.
    const anonymous = isPublic(url.pathname, req.method);
    // Never expose the runtime REPL through the public proxy.
    if (url.pathname === "/procs/repl" || url.pathname.startsWith("/procs/repl/")) return new Response("Forbidden", { status: 403 });
    const origin = req.headers.get("origin");
    const sameOrigin = origin === url.origin || (publicOrigin !== null && origin === publicOrigin);
    if (!anonymous && !readOnly(req) && !sameOrigin) return new Response("Invalid origin", { status: 403 });
    const ip = srv.requestIP(req)?.address ?? "";
    if (url.pathname.startsWith("/_auth/")) return authRoute(req, url, ip);
    const user = open || anonymous ? null : users.sessionUser(db, readToken(req));
    if (!open && !anonymous) {
        if (!user) {
            const next = `/_auth/login?next=${encodeURIComponent(url.pathname + url.search)}`;
            if (req.headers.get("hx-request")) return new Response("Sign in required", { status: 401, headers: { "hx-redirect": next } });
            if (req.method === "GET" && (req.headers.get("accept") ?? "").includes("text/html")) return redirect(next);
            return Response.json({ error: "Sign in required" }, { status: 401 });
        }
        const privileged = url.pathname.startsWith("/_agent/") || url.pathname.startsWith("/_control/");
        if ((privileged && user.role !== "admin") || (user.role === "viewer" && !readOnly(req))) {
            return Response.json({ error: "Your role does not allow this" }, { status: 403 });
        }
    }
    if (url.pathname === "/_control/users" || url.pathname.startsWith("/_control/users/")) return usersRoute(req, url, user, ip);
    if (url.pathname === "/_control/" && req.method === "GET") return new Response(Bun.file(assets), { headers: { "content-type": "text/html" } });
    if (["/_control/agent.js", "/_control/agent.css"].includes(url.pathname) && req.method === "GET") return new Response(Bun.file(resolve(import.meta.dir, url.pathname.endsWith(".js") ? "agent.js" : "agent.css")), { headers: { "content-type": url.pathname.endsWith(".js") ? "text/javascript" : "text/css" } });
    if (url.pathname === "/_control/status" && req.method === "GET") return Response.json(Object.fromEntries(Object.entries(children).map(([k, v]) => [k, { pid: v.proc.pid, state: v.state, restarts: v.restarts }])));
    if (url.pathname === "/_control/restart" && req.method === "POST") {
        const child = children.runtime;
        if (child.timer) { clearTimeout(child.timer); child.timer = undefined; }
        child.restarts = 0;
        if (child.proc.exitCode === null) child.proc.kill();
        else spawn("runtime", runtimeEntry);
        return Response.json({ ok: true });
    }
    const agentRoutes: Record<string, string> = { "/_agent/state": "/state", "/_agent/submit": "/submit", "/_agent/abort": "/abort", "/_agent/reset": "/reset", "/_agent/auth": "/auth", "/_agent/auth/login": "/auth/login", "/_agent/auth/respond": "/auth/respond", "/_agent/auth/cancel": "/auth/cancel", "/_agent/auth/logout": "/auth/logout", "/_agent/model": "/model" };
    const isAgent = url.pathname.startsWith("/_agent/");
    if (isAgent && !agentRoutes[url.pathname]) return new Response("Not found", { status: 404 });
    if (url.pathname.startsWith("/_control/")) return new Response("Not found", { status: 404 });
    const target = children[isAgent ? "agent" : "runtime"];
    const headers = new Headers(req.headers);
    headers.delete("authorization");
    const cookies = withoutSession(req.headers.get("cookie"));
    if (cookies) headers.set("cookie", cookies); else headers.delete("cookie");
    // Who is asking, as the supervisor decided it. A client cannot send this
    // header itself: it is always replaced here.
    headers.delete("x-bot-user");
    headers.delete("x-bot-access");
    if (anonymous) headers.set("x-bot-access", "public");
    if (user) headers.set("x-bot-user", encodeURIComponent(JSON.stringify({ id: user.id, login: user.login, name: user.name, role: user.role })));
    if (isAgent) headers.set("authorization", `Bearer ${token}`);
    try {
        return await fetch(`http://127.0.0.1:${target.port}${isAgent ? agentRoutes[url.pathname] : url.pathname + url.search}`, {
            method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body, redirect: "manual",
            // A browser that goes away takes its upstream request with it. Without
            // this an event stream (/procs/events) outlives its tab: every reload
            // leaks one runtime connection until fetch's pool (256) is full and
            // every proxied request waits forever.
            signal: req.signal,
            // Pass the runtime's answer through untouched. A proxy that decompresses
            // and keeps the header hands the browser a body that claims to be gzip
            // and is not; with it off, a compressed sheet arrives compressed at a
            // seventh of the bytes instead of being inflated back on the way out.
            decompress: false,
        });
    } catch {
        return isAgent ? Response.json({ error: "Agent worker unavailable" }, { status: 503 }) : new Response('Runtime unavailable. <a href="/_control/">Open recovery chat</a>', { status: 503, headers: { "content-type": "text/html" } });
    }
} });
console.log(`Supervisor: http://${server.hostname}:${server.port}; sign in at /_auth/login`);
async function stop() {
    if (stopping) return;
    stopping = true;
    server.stop(true);
    db.close();
    for (const child of Object.values(children)) { clearTimeout(child.timer); child.proc.kill(); }
    await Promise.race([Promise.all(Object.values(children).map(c => c.proc.exited)), Bun.sleep(5000)]);
    for (const child of Object.values(children)) if (child.proc.exitCode === null) child.proc.kill("SIGKILL");
    process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
