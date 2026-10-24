import { test, expect } from "bun:test";
import { testCtx } from "../$test";
import { ensureSchema } from "../../supervisor/users";

const as = (role: string, name = "Anna") => ({ "x-bot-user": encodeURIComponent(JSON.stringify({ id: "u1", login: "anna", name, role })) });

test("the signed-in operator shapes the shell: menu, account, Pi only for admins", async () => {
    const ctx = await testCtx();
    try {
        // No supervisor in front: everything, as before accounts existed.
        const bare = await (await ctx.fns.procs.http.dispatch({ url: "/bot" })).text();
        expect(bare).toContain('id="coding-agent"');
        expect(bare).not.toContain('class="asx-stack bot-account');

        const admin = await (await ctx.fns.procs.http.dispatch({ url: "/bot", headers: as("admin", "Анна <b>") })).text();
        expect(admin).toContain('id="coding-agent"');
        expect(admin).toContain('href="/team"');
        expect(admin).toContain("Анна &lt;b&gt;");
        expect(admin).toContain('action="/_auth/logout"');
        expect(admin).toContain('class="asx-stack bot-account');
        expect(admin).toContain('<a class="asx-link " href="/_auth/password"');

        for (const role of ["editor", "viewer"]) {
            const html = await (await ctx.fns.procs.http.dispatch({ url: "/bot", headers: as(role) })).text();
            expect(html).not.toContain('id="coding-agent"');
            expect(html).not.toContain("/ui/agent.js");
            expect(html).not.toContain('href="/team"');
            expect(html).toContain('href="/bot/channels"');
            expect(html).toContain(`anna · ${role}`);
        }
        // A public request may do nothing and gets the bare page, even on an
        // admin route that renders the shell.
        const pub = await (await ctx.fns.procs.http.dispatch({ url: "/bot", headers: { "x-bot-access": "public", ...as("admin") } })).text();
        expect(pub).not.toContain('id="coding-agent"');
        expect(pub).not.toContain('href="/bot/channels"');
        expect(pub).not.toContain("bot-account");
        expect(pub).not.toContain("<script");
        // A malformed header is nobody, not an error.
        expect((await ctx.fns.procs.http.dispatch({ url: "/bot", headers: { "x-bot-user": "%%%" } })).status).toBe(200);
    } finally { ctx.fns.procs.db.close({}); }
});

test("the Team page lists accounts for admins and posts changes to the supervisor", async () => {
    const ctx = await testCtx();
    try {
        expect((await ctx.fns.procs.http.dispatch({ url: "/team", headers: as("editor") })).status).toBe(403);
        const empty = await (await ctx.fns.procs.http.dispatch({ url: "/team", headers: as("admin") })).text();
        expect(empty).toContain("No accounts here");

        const db = ctx.fns.procs.db.conn();
        ensureSchema(db);
        const at = new Date().toISOString();
        db.query("INSERT INTO control_users (id, login, name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, 'x', ?, ?)").run("u1", "anna", "Anna", "admin", at, at);
        db.query("INSERT INTO control_users (id, login, name, role, password_hash, disabled_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'x', ?, ?, ?)").run("u2", "boris", "Boris", "viewer", at, at, at);
        const res = await ctx.fns.procs.http.dispatch({ url: "/team?notice=Done&tone=success", headers: as("admin") });
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain("boris");
        expect(html).toContain("Done");
        expect(html).toContain('action="/_control/users"');
        expect(html).toContain('action="/_control/users/u2/enable"');
        expect(html).toContain('action="/_control/users/u1/disable"');
        expect(html).not.toContain("password_hash");
    } finally { ctx.fns.procs.db.close({}); }
});
