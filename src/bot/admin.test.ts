import { test, expect } from "bun:test";
import { testCtx } from "../$test";

test("admin menu comes from $app cards and the dashboard renders", async () => {
    const ctx = await testCtx();
    expect(ctx.state.bot?.apps?.flows).toMatchObject({ title: "Flows", open: "/bot/flows", permission: "bot.view" });
    const res = await ctx.fns.procs.http.dispatch({ url: "/bot" });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Dashboard");
    expect(html).toContain("href=\"/bot/channels\"");
    expect(html).toContain("Runtime health");
});

test("saving and restoring a flow redirect to its version after persisting changes", async () => {
    const ctx = await testCtx();
    try {
        const definition = { id: "editor-save", start_node_id: "hello", nodes: [{ id: "hello", type: "message", text: "Before" }] };
        ctx.fns.bot.save({ definition });
        const row = ctx.fns.procs.db.select({ sql: "SELECT v.* FROM bot_flow_versions v JOIN bot_flows f ON f.id = v.bot_flow_id WHERE f.slug = ?", params: [definition.id] })[0];
        definition.nodes[0]!.text = "After save";
        const form = new FormData();
        form.set("updated_at", row.updated_at);
        form.set("definition", JSON.stringify(definition));
        const saved = await ctx.fns.procs.http.dispatch({ method: "POST", url: `/bot/flows/${row.id}`, body: form });
        expect(saved.status).toBe(303);
        expect(saved.headers.get("location")).toBe(`/bot/flows/${row.id}`);
        const read = () => JSON.parse(ctx.fns.procs.db.select({ sql: "SELECT definition FROM bot_flow_versions WHERE id = ?", params: [row.id] })[0].definition);
        expect(read().nodes[0].text).toBe("After save");
        definition.nodes[0]!.text = "After restore";
        const backup = new FormData();
        backup.set("backup", new File([JSON.stringify(definition)], "backup.json", { type: "application/json" }));
        const restored = await ctx.fns.procs.http.dispatch({ method: "POST", url: `/bot/flows/${row.id}/restore`, body: backup });
        expect(restored.status).toBe(303);
        expect(restored.headers.get("location")).toBe(`/bot/flows/${row.id}`);
        expect(read().nodes[0].text).toBe("After restore");
    } finally { ctx.fns.procs.db.close({}); }
});
