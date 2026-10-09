// The contract for a handler that throws: whoever reads HTML gets a PAGE — the
// kit's notice with an incident id, never a raw stack — and whoever reads JSON
// or plain text keeps the old developer's 500. This is the boundary that makes
// "stack trace on a patient's screen" impossible by construction.
import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { testCtx } from "procs/test";

async function boom(env?: Record<string, string>) {
    const ctx: any = await testCtx({ root: resolve(import.meta.dir, "..", "..", "..", "test-proc") });
    Object.assign(ctx.env, env ?? {});                          // after testCtx — it pins NODE_ENV=test
    ctx.state.procs.http.routes["/boom"] = { GET: () => { throw new Error("kaput"); } };
    return ctx;
}

test("an htmx swap gets the notice, not the stack", async () => {
    const ctx = await boom();
    const res = await ctx.fns.procs.http.dispatch({ url: "/boom", headers: { "hx-request": "true" } });
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("Something went wrong");
    expect(html).toContain('data-page="crashed"');
    expect(html).not.toContain("crashed.test.ts");              // the stack never reaches the page…
    expect(html).toContain("kaput");                            // …the message is folded behind <details>
});

test("a full page load gets the same page through the layout", async () => {
    const ctx = await boom();
    const res = await ctx.fns.procs.http.dispatch({ url: "/boom", headers: { accept: "text/html" } });
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("Something went wrong");
});

test("production folds nothing out: the id alone", async () => {
    const ctx = await boom({ NODE_ENV: "production" });
    const res = await ctx.fns.procs.http.dispatch({ url: "/boom", headers: { "hx-request": "true" } });
    const html = await res.text();
    expect(html).toContain("Something went wrong");
    expect(html).not.toContain("kaput");
});

test("an API caller keeps the plain 500", async () => {
    const ctx = await boom();
    const res = await ctx.fns.procs.http.dispatch({ url: "/boom" });
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toContain("kaput");
});

// Not a crash but the same family of guard: a PAGE owns #main, and when htmx 4
// says it was about to put one anywhere else (HX-Target of a mis-aimed boosted
// link), the response corrects the aim — the phone-in-a-phone recursion class.
test("a page aimed at anything but #main is retargeted there", async () => {
    const ctx: any = await testCtx({ root: resolve(import.meta.dir, "..", "..", "..", "test-proc") });
    ctx.state.procs.http.routes["/page"] = { GET: () => ({ title: "p", main: "<p>hi</p>" }) };
    const aimed = await ctx.fns.procs.http.dispatch({ url: "/page", headers: { "hx-request": "true", "hx-target": "a" } });
    expect(aimed.headers.get("HX-Retarget")).toBe("#main");
    const proper = await ctx.fns.procs.http.dispatch({ url: "/page", headers: { "hx-request": "true", "hx-target": "div#main" } });
    expect(proper.headers.get("HX-Retarget")).toBeNull();
    const noAim = await ctx.fns.procs.http.dispatch({ url: "/page", headers: { "hx-request": "true" } });
    expect(noAim.headers.get("HX-Retarget")).toBeNull();
});
