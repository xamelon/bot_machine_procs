import { test, expect } from "bun:test";
import { testCtx } from "../$test";

test("Senler authenticates, validates targets and queues connection-scoped idempotent launches", async () => {
    const ctx = await testCtx({ env: { WEBHOOK_SECRET: "test-secret" } });
    try {
        const a = ctx.fns.bot.saveConnection({ channel: "echo", name: "A", publicId: "hook-a" });
        const b = ctx.fns.bot.saveConnection({ channel: "echo", name: "B", publicId: "hook-b" });
        ctx.fns.bot.save({ definition: { id: "hook-flow", start_node_id: "hello", nodes: [{ id: "hello", type: "message", text: "Hello" }] }, connections: ["hook-a", "hook-b"] });
        const base = { secret: "test-secret", vk_user_id: 42, connection_id: a.publicId, flow_slug: "hook-flow" };
        const post = (changes: any = {}) => ctx.fns.procs.http.dispatch({ method: "POST", url: "/bot/public/senler", body: { ...base, ...changes } });
        expect((await post({ secret: "wrong" })).status).toBe(401);
        const invalid = [
            { connection_id: "missing" }, { vk_user_id: null }, { flow_slug: "missing" },
            { flow_slug: "" }, { start_node_id: "missing" }, { start_node_id: {} },
            { session_mode: "bad" }, { idempotency_key: {} },
        ];
        for (const change of invalid) {
            const response = await post(change);
            expect(response.status).toBe(200);
            expect((await response.json()).ok).toBe(false);
        }
        expect(ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_inbox_events" })).toHaveLength(0);
        expect(await (await post({ idempotency_key: "once" })).json()).toEqual({ ok: true });
        await post({ idempotency_key: "once" });
        await post({ connection_id: b.id, idempotency_key: "once", session_mode: "restart" });
        const rows = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_inbox_events ORDER BY id" });
        expect(rows).toHaveLength(2);
        expect(rows[0].idempotency_key).toBe("hook-a:once");
        expect(JSON.parse(rows[0].payload)).toMatchObject({ kind: "manual", event: "hook.hook-flow", external_id: "42", start_node_id: "hello", session_mode: "start_or_jump" });
        expect(await ctx.fns.bot.processInbox({ limit: 10 })).toMatchObject({ processed: 2, failed: 0 });
        expect(ctx.fns.bot.pending()).toHaveLength(2);
        await post(); await post();
        expect(ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_inbox_events" })).toHaveLength(4);
        ctx.fns.procs.db.run({ sql: "UPDATE bot_flow_connections SET enabled = 0 WHERE bot_channel_connection_id = ?", params: [a.id] });
        expect((await (await post()).json()).error).toContain("not connected");
        ctx.fns.procs.db.run({ sql: "UPDATE bot_channel_connections SET status = 'disabled' WHERE id = ?", params: [b.id] });
        expect((await (await post({ connection_id: b.publicId })).json()).ok).toBe(false);
    } finally { ctx.fns.procs.db.close({}); }
});

test("Senler is disabled without a secret; request builder never leaks it", async () => {
    const ctx = await testCtx({ env: { WEBHOOK_SECRET: "" } });
    const enabled = await testCtx({ env: { WEBHOOK_SECRET: "never-render-this-secret" } });
    try {
        expect((await ctx.fns.procs.http.dispatch({ method: "POST", url: "/bot/public/senler", body: {} })).status).toBe(503);
        enabled.fns.bot.saveConnection({ channel: "echo", name: "A", publicId: "builder-a" });
        enabled.fns.bot.save({ definition: { id: "builder-flow", start_node_id: "hello", nodes: [{ id: "hello", type: "message", text: "Hello" }] } });
        const page = await enabled.fns.procs.http.dispatch({ url: "/bot/triggers" });
        const html = await page.text();
        expect(html).toContain("/bot/public/senler");
        expect(html).not.toContain("never-render-this-secret");
        expect(html).toContain('data-bot-webhook');
        expect(html).toContain('name="session_mode"');
        const script = await enabled.fns.procs.http.dispatch({ url: "/bot/webhook.js" });
        expect(script.status).toBe(200);
        expect(await script.text()).toContain("YOUR_WEBHOOK_SECRET");
    } finally { ctx.fns.procs.db.close({}); enabled.fns.procs.db.close({}); }
});
