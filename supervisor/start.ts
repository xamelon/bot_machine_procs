// Host entrypoint. Deliberately does not boot/scan the editable application.
import { resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

const root = resolve(process.env.APP_ROOT || process.cwd());
await mkdir(resolve(root, ".runtime/control"), { recursive: true });
const token = randomBytes(32).toString("hex");
const port = Number(process.env.PORT || 4100);
const passwordPath = resolve(root, ".runtime/control/password");
let password = process.env.CONTROL_PASSWORD;
if (!password) {
    try { password = (await readFile(passwordPath, "utf8")).trim(); }
    catch { password = randomBytes(24).toString("hex"); await writeFile(passwordPath, password, { mode: 0o600 }); }
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
spawn("runtime", resolve(root, "src/$main.ts"));
spawn("agent", resolve(import.meta.dir, "agent.entry.ts"));

const assets = resolve(import.meta.dir, "recovery.html");
// `CONTROL_AUTH=open` turns the operator login off for as long as the variable is
// set — for measuring what a visitor sees through a tunnel without a password in
// the way. It is loud on purpose: the line says so in the log, and it is a line
// in `.env`, so putting it back is a one-line edit rather than a memory.
const open = process.env.CONTROL_AUTH === "open";
if (open) console.log("Supervisor: CONTROL_AUTH=open — operator login is OFF, do not leave this running");
const server = Bun.serve({ hostname: process.env.SUPERVISOR_HOST || "127.0.0.1", port, idleTimeout: 120, async fetch(req) {
    const url = new URL(req.url);
    const webhook = req.method === "POST" && url.pathname.startsWith("/bot/webhook/");
    if (!open && !webhook && req.headers.get("authorization") !== `Basic ${btoa(`admin:${password}`)}`) {
        return new Response("Admin login required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Bot control"' } });
    }
    // Never expose the runtime REPL through the public proxy.
    if (url.pathname === "/procs/repl" || url.pathname.startsWith("/procs/repl/")) return new Response("Forbidden", { status: 403 });
    if (!webhook && !["GET", "HEAD"].includes(req.method) && req.headers.get("origin") !== url.origin) return new Response("Invalid origin", { status: 403 });
    if (url.pathname === "/_control/" && req.method === "GET") return new Response(Bun.file(assets), { headers: { "content-type": "text/html" } });
    if (["/_control/agent.js", "/_control/agent.css"].includes(url.pathname) && req.method === "GET") return new Response(Bun.file(resolve(import.meta.dir, url.pathname.endsWith(".js") ? "agent.js" : "agent.css")), { headers: { "content-type": url.pathname.endsWith(".js") ? "text/javascript" : "text/css" } });
    if (url.pathname === "/_control/status" && req.method === "GET") return Response.json(Object.fromEntries(Object.entries(children).map(([k, v]) => [k, { pid: v.proc.pid, state: v.state, restarts: v.restarts }])));
    if (url.pathname === "/_control/restart" && req.method === "POST") {
        const child = children.runtime;
        if (child.timer) { clearTimeout(child.timer); child.timer = undefined; }
        child.restarts = 0;
        if (child.proc.exitCode === null) child.proc.kill();
        else spawn("runtime", resolve(root, "src/$main.ts"));
        return Response.json({ ok: true });
    }
    const agentRoutes: Record<string, string> = { "/_agent/state": "/state", "/_agent/submit": "/submit", "/_agent/abort": "/abort", "/_agent/auth": "/auth", "/_agent/auth/login": "/auth/login", "/_agent/auth/respond": "/auth/respond", "/_agent/auth/cancel": "/auth/cancel", "/_agent/auth/logout": "/auth/logout", "/_agent/model": "/model" };
    const isAgent = url.pathname.startsWith("/_agent/");
    if (isAgent && !agentRoutes[url.pathname]) return new Response("Not found", { status: 404 });
    if (url.pathname.startsWith("/_control/")) return new Response("Not found", { status: 404 });
    const target = children[isAgent ? "agent" : "runtime"];
    const headers = new Headers(req.headers);
    headers.delete("authorization");
    if (isAgent) headers.set("authorization", `Bearer ${token}`);
    try {
        return await fetch(`http://127.0.0.1:${target.port}${isAgent ? agentRoutes[url.pathname] : url.pathname + url.search}`, {
            method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body, redirect: "manual",
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
console.log(`Supervisor: http://${server.hostname}:${server.port}; login admin; password in ${passwordPath} (or CONTROL_PASSWORD)`);
async function stop() {
    if (stopping) return;
    stopping = true;
    server.stop(true);
    for (const child of Object.values(children)) { clearTimeout(child.timer); child.proc.kill(); }
    await Promise.race([Promise.all(Object.values(children).map(c => c.proc.exited)), Bun.sleep(5000)]);
    for (const child of Object.values(children)) if (child.proc.exitCode === null) child.proc.kill("SIGKILL");
    process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
