// FUNCTIONAL test: src/ui.test.ts ↔ the src/ui/ namespace — and the one rule
// that makes a page drivable at all. The workspace shows module pages to the
// user by pointing at their data-* markers; a page without them is a page the
// agent cannot show anyone, so this is checked for every mounted tab rather
// than left to whoever wrote it.
import { test, expect } from "bun:test";
import { testCtx } from "../$test";

const ctx = await testCtx();

// Every renderer in the repo aliases this one function, so its exact behaviour —
// including what a missing value prints — is load-bearing in ~110 files.
test("escape covers the five characters, and a missing value is empty", () => {
    expect(ctx.fns.procs.ui.escape({ text: `<a href="x">O'Brien & co</a>` }))
        .toBe("&lt;a href=&quot;x&quot;&gt;O&#39;Brien &amp; co&lt;/a&gt;");
    expect(ctx.fns.procs.ui.escape({ text: undefined })).toBe("");
    expect(ctx.fns.procs.ui.escape({ text: null })).toBe("");
    expect(ctx.fns.procs.ui.escape({ text: 0 })).toBe("0");
});

test("attr emits the markers, drops the empty ones and escapes values", () => {
    expect(ctx.fns.procs.ui.attr({ entity: "file", id: "src/a.ts" })).toBe(`data-entity="file" data-id="src/a.ts"`);
    expect(ctx.fns.procs.ui.attr({ entity: "file", id: undefined, status: "" })).toBe(`data-entity="file"`);
    expect(ctx.fns.procs.ui.attr({ id: `a"b` })).toBe(`data-id="a&quot;b"`);
});

// A layout hardcodes the framework's own asset urls as strings, which nothing
// type-checks — so when the framework moved under /procs they silently kept
// pointing at the old paths and the shell served 404s for htmx and the event
// stream. Pin the layout to the route table.
test("every path the default layout hardcodes is a route that exists", () => {
    const html = ctx.fns.procs.ui.layout({ main: "" });
    const paths = [
        ...html.matchAll(/<script src="(\/[^"?#]*)"/g),
        ...html.matchAll(/<link [^>]*href="(\/[^"?#]*)"/g),
    ].map(m => m[1]!);
    const missing = [...new Set(paths)].filter(p => !ctx.fns.procs.http.match({ method: "GET", pathname: p }));
    expect(missing).toEqual([]);
});

test("the components carry the markers, so a page built from them cannot forget", () => {
    const html = ctx.fns.procs.ui.page({
        page: "demo",
        title: "Demo",
        main: ctx.fns.procs.ui.card({
            title: "1 item",
            right: ctx.fns.procs.ui.button({ action: "refresh", label: "Refresh", get: "/x" }),
            body: ctx.fns.procs.ui.input({ name: "q" }),
        }),
    });
    expect(html).toContain('data-page="demo"');
    expect(html).toContain('data-action="refresh"');
    expect(html).toContain('name="q"');
});

test("a dialog is a native panel opened by a button", () => {
    const html = ctx.fns.procs.ui.dialog({
        id: "confirm",
        trigger: ctx.fns.procs.ui.button({ label: "Delete", icon: "ph-trash", variant: "destructive" }),
        title: "Delete?", body: "<p>gone for good</p>",
    });
    expect(html).toContain(`class="asx-dialog`);
    expect(html).toContain(`id="confirm"`);
    expect(html).toContain(`type="button"`);
    expect(html).toContain(`data-asx-dialog-open="confirm"`);
    expect(html).not.toContain("modal-box");
});

// A sidebar link navigates with htmx, because a full document per page change is
// the whole shell re-rendered and every stylesheet re-asked for. The framework is
// already the other half of that contract: `toResponse` answers an `HX-Request`
// with the fragment and retargets it to `#main`. So the nav has to ask.
test("a nav link navigates with htmx, and the nav keeps its own active item in step", async () => {
    const link = ctx.fns.procs.ui.navItem({ label: "Flows", href: "/bot/flows", active: true });
    expect(link).toContain(`hx-boost="true"`);
    expect(link).toContain(`href="/bot/flows"`);

    // A plain button stays a button: there is nothing to navigate to.
    expect(ctx.fns.procs.ui.navItem({ label: "Later" })).not.toContain("hx-boost");

    // The script that re-decides `data-active` after a swap ships with the nav —
    // #main is swapped and the aside is not, so nobody else would update it.
    const nav = ctx.fns.procs.ui.sideNav({ title: "Bot", menus: [{ label: "Bot", items: [{ label: "Flows", href: "/bot/flows" }] }] });
    expect(nav).toMatch(/src="\/procs\/ui\/nav\.js\?v=\d+"/);

    // And it is a route this process serves, not a 404 in the head.
    const served = await ctx.fns.procs.http.dispatch({ url: "/procs/ui/nav.js" });
    expect(served.status).toBe(200);
    expect(await served.text()).toContain("data-active");
});
