// FUNCTIONAL test: libs/screen/src/screen.test.ts ↔ the screen/ namespace — the wire
// the coding agent drives the open tab over. It has three ends in three files
// joined by nothing but strings: `eval` counts the connected tabs on
// ctx.state.procs.events, pushes the code down the event stream, and the tab
// posts the answer back to POST /screen/result. Two of those strings went
// stale when the framework moved under its own name, and every break on this
// wire looks identical from outside — a verb that times out. So drive the round
// trip rather than the parts.
import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { testCtx } from "procs/test";

const ctx = await testCtx({ root: resolve(import.meta.dir, "..", "..", "..", "workspace") });


async function announce(tabId: string, opts: any = {}) {
    await ctx.fns.procs.http.dispatch({ method: "POST", url: "/screen/here", body: {
        tabId, connectionId: `connection-${tabId}`, url: "/", focused: opts.focused ?? true,
        visible: true, lifecycle: opts.lifecycle ?? "active", lastInteractionAt: opts.lastInteractionAt ?? Date.now(),
    } });
}
test("eval targets one stable browser tab when tabId is given", async () => {
    const seen: any[] = [];
    await announce("tab-a");
    const off = ctx.fns.procs.events.subscribe({ handler: (e: any) => {
        if (e.type !== "eval") return;
        seen.push(e);
        ctx.fns.procs.http.dispatch({ method: "POST", url: "/screen/result", body: { id: e.id, tabId: e.tabId, connectionId: e.connectionId, value: e.tabId } });
    } });
    expect(await ctx.fns.screen.eval({ code: "return 1", tabId: "tab-a", timeoutMs: 2_000 })).toBe("tab-a");
    expect(seen.at(-1)?.tabId).toBe("tab-a");
    off();
});

test("a tab's answer comes back through the route the layout posts to", async () => {
    // The tab: subscribed to the event stream, running what it is sent, posting
    await announce("tab-roundtrip");
    // the result to /screen/result — the browser half, minus the browser.
    const off = ctx.fns.procs.events.subscribe({
        handler: (e: any) => {
            if (e.type !== "eval") return;
            ctx.fns.procs.http.dispatch({ method: "POST", url: "/screen/result", body: { id: e.id, tabId: e.tabId, connectionId: e.connectionId, value: { ran: e.code } } });
        },
    });
    expect(await ctx.fns.screen.eval({ code: "return 1", timeoutMs: 2_000 })).toEqual({ ran: "return 1" });
    off();
});

test("leader selection is focused, addressable, and rejects another tab's result", async () => {
    await announce("tab-old", { focused: false, lastInteractionAt: 1 });
    await announce("tab-leader", { focused: true, lastInteractionAt: 2 });
    for (const [id, tab] of Object.entries((ctx.state.screen as any).tabs)) if (id !== "tab-old" && id !== "tab-leader") tab.focused = false;
    const seen: any[] = [];
    const off = ctx.fns.procs.events.subscribe({ handler: async (e: any) => {
        if (e.type !== "eval" || seen.length) return;
        seen.push(e);
        const wrong = await ctx.fns.procs.http.dispatch({ method: "POST", url: "/screen/result", body: {
            id: e.id, tabId: "tab-old", connectionId: "connection-tab-old", value: "wrong",
        } });
        expect(await wrong.json()).toMatchObject({ reason: "wrong screen tab" });
        await ctx.fns.procs.http.dispatch({ method: "POST", url: "/screen/result", body: {
            id: e.id, tabId: e.tabId, connectionId: e.connectionId, value: "leader",
        } });
    } });
    expect(await ctx.fns.screen.eval({ code: "return 1", timeoutMs: 2_000 })).toBe("leader");
    expect(seen[0]).toMatchObject({ tabId: "tab-leader", connectionId: "connection-tab-leader" });
    expect(seen[0].expiresAt).toBeGreaterThan(Date.now());
    off();
});


test("a connected tab that stays quiet is a silent page, not no page at all", async () => {
    // The two failures need different answers from the user — reopen the tab, or
    await announce("tab-quiet");
    // look at why it choked — so the count has to come off the state the event
    // stream actually keeps its subscribers on.
    const off = ctx.fns.procs.events.subscribe({ handler: () => {} });
    await expect(ctx.fns.screen.eval({ code: "return 1", timeoutMs: 200 })).rejects.toThrow("the page did not answer in 200ms");
    off();
});

test("missing leader fails immediately inside the requested timeout budget", async () => {
    (ctx.state.screen as any).tabs = {};
    const started = performance.now();
    await expect(ctx.fns.screen.eval({ code: "return 1", timeoutMs: 200 })).rejects.toThrow("no visible workspace tab");
    expect(performance.now() - started).toBeLessThan(350);
    (ctx.state.screen as any).tabs = {};
});
// Where the person is, without stopping to ask them. `readScreen` is a round
// trip through the event stream and only works while a tab is open; "where are
// you" is asked before every reply, so the tab volunteers it instead.
test("an open tab says where it is, and where() reads it without a round trip", async () => {
    (ctx.state.screen as any).here = null;

    const said = await ctx.fns.procs.http.dispatch({
        url: "/screen/here", method: "POST",
        body: JSON.stringify({ url: "/ehr/patient/seed-anna?tab=apps", title: "Anna Ivanova", page: "chart" }),
        headers: { "content-type": "application/json" },
    });
    expect(said.status).toBe(204);

    const here = ctx.fns.screen.where({})!;
    expect(here.url).toBe("/ehr/patient/seed-anna?tab=apps");
    expect(here.page).toBe("chart");
    expect(here.stale).toBe(false);
    // …and it is honest about age: a tab that said nothing for a while may be
    // closed, on another window, or looking at something else entirely.
    expect(ctx.fns.screen.where({ staleAfterMs: -1 })!.stale).toBe(true);

    // A beacon with no url changes nothing rather than blanking what we knew.
    await ctx.fns.procs.http.dispatch({ url: "/screen/here", method: "POST", body: "{}", headers: { "content-type": "application/json" } });
    expect(ctx.fns.screen.where({})!.url).toBe("/ehr/patient/seed-anna?tab=apps");
});

// No visible tab is a queue, not a failure: the open is kept and answered
// `deferred`, and the first tab that says it is visible gets it.
test("screen.open with no visible tab defers, and the next visible tab opens it", async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, "..", "..", "..", "workspace") });
    (ctx.state as any).screen = { nextId: 1, pending: new Map(), tabs: {} };
    const answer: any = await ctx.fns.screen.open({ url: "/apps", read: false });
    expect(answer.deferred).toBe(true);
    expect((ctx.state.screen as any).deferred.opts.url).toBe("/apps");
    // A tab comes back: /screen/here says it is visible, and the deferred open is spent on it.
    const opened: any[] = [];
    (ctx.state as any).registry.screen.open = async (_c: any, _s: any, o: any) => { opened.push(o); return {}; };   // ctx.fns is a Proxy over the registry
    await ctx.fns.procs.http.dispatch({ url: "/screen/here", method: "POST", body: { tabId: "t1", connectionId: "c1", url: "/", visible: true, focused: true, lifecycle: "active" } });
    expect(opened.map(o => o.url)).toEqual(["/apps"]);
    expect((ctx.state.screen as any).deferred).toBeUndefined();
});
