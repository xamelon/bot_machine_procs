import { test, expect } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("supervisor protects control APIs and recovery survives runtime death", async () => {
    const root = await mkdtemp(join(tmpdir(), "procs-host-"));
    const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
    const port = probe.port!; probe.stop(true);
    await mkdir(join(root, "src"));
    await Bun.write(join(root, "src/$main.ts"), 'Bun.serve({ hostname: "127.0.0.1", port: Number(process.env.PORT), fetch: () => new Response("runtime") });');
    // `CONTROL_AUTH=open` in a developer's .env turns the login off for a tunnel
    // measurement. A test about that login must not inherit it: the switch is
    // deleted here, so the child is a supervisor with its door shut whatever the
    // machine is set up for.
    const env = { ...process.env, APP_ROOT: root, PORT: String(port), CONTROL_PASSWORD: "test-password", OPENAI_API_KEY: "" };
    delete (env as any).CONTROL_AUTH;
    const proc = Bun.spawn([process.execPath, join(import.meta.dir, "start.ts")], { cwd: root, env, stdout: "ignore", stderr: "ignore" });
    const base = `http://127.0.0.1:${port}`;
    const headers = { authorization: `Basic ${btoa("admin:test-password")}` };
    try {
        let ready = false;
        for (let i = 0; i < 60; i++) {
            try { if ((await fetch(base + "/_agent/state", { headers })).status === 200) { ready = true; break; } } catch {}
            await Bun.sleep(100);
        }
        expect(ready).toBe(true);
        expect((await fetch(base + "/_agent/state")).status).toBe(401);
        expect((await fetch(base + "/procs/repl", { headers })).status).toBe(403);
        expect((await fetch(base + "/_agent/submit", { headers, method: "POST", body: "{}" })).status).toBe(403);
        expect((await fetch(base + "/_agent/auth/login", { headers, method: "POST", body: "{}" })).status).toBe(403);
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
    } finally {
        proc.kill(); await proc.exited;
        await rm(root, { recursive: true, force: true });
    }
}, 15_000);
