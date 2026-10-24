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

test("the channels page connects and disconnects the flows a channel serves", async () => {
    const ctx = await testCtx();
    try {
        for (const slug of ["welcome", "festival"]) {
            ctx.fns.bot.save({ definition: { id: slug, start_node_id: "hello", nodes: [{ id: "hello", type: "message", text: slug }] } });
        }
        const max = ctx.fns.bot.saveConnection({ channel: "max", name: "Max bot", publicId: "chan-max" });
        const links = () => ctx.fns.procs.db.select({
            sql: `SELECT f.slug FROM bot_flow_connections fc JOIN bot_flows f ON f.id = fc.bot_flow_id
                  WHERE fc.bot_channel_connection_id = ? ORDER BY f.slug`,
            params: [max.id],
        }).map((row: any) => row.slug);

        const page = await ctx.fns.procs.http.dispatch({ url: "/bot/channels" });
        const html = await page.text();
        expect(html).toContain(`action="/bot/channels/${max.id}/flows"`);
        expect(html).toContain(`name="flows" value="welcome"`);
        expect(html).toContain(`name="flows" value="festival"`);

        const form = (slugs: string[]) => {
            const data = new FormData();
            for (const slug of slugs) data.append("flows", slug);
            return ctx.fns.procs.http.dispatch({ method: "POST", url: `/bot/channels/${max.id}/flows`, body: data });
        };
        expect((await form(["festival", "welcome"])).status).toBe(303);
        expect(links()).toEqual(["festival", "welcome"]);
        // Re-saving keeps the link that is still ticked instead of starting over.
        expect((await form(["festival"])).status).toBe(303);
        expect(links()).toEqual(["festival"]);
        // An unknown slug is refused and the current links survive the refusal.
        expect((await form(["nope"])).status).toBe(303);
        expect(links()).toEqual(["festival"]);
        expect((await form([])).status).toBe(303);
        expect(links()).toEqual([]);
    } finally { ctx.fns.procs.db.close({}); }
});
