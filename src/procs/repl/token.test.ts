import { test, expect } from "bun:test";
import { mkdtemp, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { testCtx } from "../../$test";

test("REPL renews expiring tokens, deduplicates renewal and writes a private file", async () => {
    const workdir = await mkdtemp(join(tmpdir(), "repl-renew-"));
    const ctx = await testCtx({ workdir });
    try {
        const first = await ctx.fns.procs.repl.token({});
        expect(await ctx.fns.procs.repl.token({})).toBe(first);
        const timer = ctx.state.procs.repl.renewalTimer;
        expect(timer).toBeDefined();
        const short = await ctx.fns.procs.auth.sign({ sub: "repl", name: "repl", kind: "repl", seconds: 60 });
        ctx.state.procs.repl.token = short;
        const tokens = await Promise.all(Array.from({ length: 5 }, () => ctx.fns.procs.repl.token({})));
        expect(new Set(tokens).size).toBe(1);
        expect(tokens[0]).not.toBe(short);
        const claims = await ctx.fns.procs.auth.verify({ token: tokens[0]! });
        expect(claims!.exp - Date.now() / 1000).toBeGreaterThan(86000);
        const file = join(workdir, ".runtime/repl-token");
        expect(await readFile(file, "utf8")).toBe(tokens[0]);
        expect((await stat(file)).mode & 0o777).toBe(0o600);
        ctx.state.procs.repl.token = await ctx.fns.procs.auth.sign({ sub: "repl", name: "repl", kind: "repl", seconds: -1 });
        expect(await ctx.fns.procs.repl.token({})).toBeTruthy();
    } finally {
        clearTimeout(ctx.state.procs.repl.renewalTimer);
        ctx.fns.procs.db.close({});
        await rm(workdir, { recursive: true, force: true });
    }
});

test("production REPL uses AGENT_REPL=1 and still refuses missing tokens and proxies", async () => {
    const workdir = await mkdtemp(join(tmpdir(), "repl-prod-"));
    const ctx = await testCtx({ workdir, env: { AGENT_REPL: "0" } });
    try {
        const token = await ctx.fns.procs.repl.token({});
        ctx.env.NODE_ENV = "production";
        const call = (headers: Record<string, string> = {}) => ctx.fns.procs.http.dispatch({ method: "POST", url: "/procs/repl", body: "1 + 1", headers });
        const auth = { authorization: `Bearer ${token}` };
        expect((await call(auth)).status).toBe(403);
        ctx.env.AGENT_REPL = "1";
        expect((await call()).status).toBe(403);
        expect((await call({ ...auth, "x-forwarded-for": "127.0.0.1" })).status).toBe(403);
        const response = await call(auth);
        expect(response.status).toBe(200);
        expect((await response.json()).return).toBe(2);
    } finally {
        clearTimeout(ctx.state.procs.repl.renewalTimer);
        ctx.fns.procs.db.close({});
        await rm(workdir, { recursive: true, force: true });
    }
});
