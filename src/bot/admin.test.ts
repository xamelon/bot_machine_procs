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
