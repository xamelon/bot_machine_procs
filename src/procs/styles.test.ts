// FUNCTIONAL test: src/styles.test.ts ↔ src/styles/ + the $style_ convention.
import { test, expect } from "bun:test";
import { testCtx } from "../$test";
import classify from "./project/classify";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ctx = await testCtx();

test("$style_<name>.css is a stylesheet, routed by its module and name", () => {
    expect(classify(ctx, null, { rel: "procs/styles/$style_app.css" })).toMatchObject({ kind: "style", routePath: "/procs/styles/app.css" });
    expect(classify(ctx, null, { rel: "app/$style_theme.css" })).toMatchObject({ kind: "style", routePath: "/app/theme.css" });
    // a $script .css is still a raw asset, not a stylesheet
    expect(classify(ctx, null, { rel: "chat/$script_x.css" }).kind).toBe("script");
    expect(classify(ctx, null, { rel: "$style_.css" }).kind).toBe("skip");
});

test("loadRoutes registers the stylesheet and the layout links it", async () => {
    await ctx.fns.procs.http.loadRoutes({});
    // the workspace's own $style_app.css is in the scan
    expect(ctx.state.procs?.styles.map((s: any) => s.href)).toContain("/procs/styles/app.css");
    // and it leads the list (a project/module style cascades after it)
    expect(ctx.state.procs.styles![0]!.href).toBe("/procs/styles/app.css");
    expect(ctx.state.procs?.http.routes["/procs/styles/app.css"]?.GET).toBeFunction();
});

test("the framework's own sheet leads whatever order the scan hands them in", async () => {
    const ctx = await testCtx();
    const entry = (routePath: string) => ({ routePath, abs: `/tmp${routePath}`, root: "/tmp", rel: routePath });
    ctx.state.procs.styles = [];
    // an app's sheet discovered FIRST — the sort is the only thing that puts the
    // framework's back in front, so a module's rules still cascade over it.
    await (ctx.state as any).procs.boot.loaders.style(ctx, null, { entries: [entry("/app/theme.css"), entry("/procs/styles/app.css")] });
    expect(ctx.state.procs.styles!.map((s: any) => s.href)).toEqual(["/procs/styles/app.css", "/app/theme.css"]);
});

// Every sheet in the tree is plain CSS: Bun bundles it with nothing left over
// that only Tailwind understood (the browser would silently drop it), and the
// routes it points at (the font) stay routes.
test("every sheet in the tree bundles as plain CSS", async () => {
    await ctx.fns.procs.http.loadRoutes({});
    for (const style of ctx.state.procs.styles ?? []) {
        const result = await Bun.build({ entrypoints: [style.abs], minify: true, external: ["/*"], throw: false });
        expect({ sheet: style.href, logs: result.logs.map(l => String(l.message)) }).toEqual({ sheet: style.href, logs: [] });
        const css = await ctx.fns.procs.styles.build({ abs: style.abs });
        expect(css).not.toMatch(/@(theme|apply|plugin|custom-variant|source|utility)\b/);
    }
    const app = await ctx.fns.procs.styles.current({ key: ctx.state.procs.styles![0]!.key });
    expect(app).toContain("/procs/styles/font/cyrillic.woff2");
    expect(app).toContain("@layer reset");
    expect(app).not.toContain("@layer utilities");
});

test("the route serves the sheet as CSS, and an edit lands after a rebuild", async () => {
    const ctx = await testCtx();
    const dir = await mkdtemp(join(tmpdir(), "procs-style-"));
    const abs = join(dir, "$style_theme.css");
    await writeFile(abs, `@import "./part.css";\n.a { & .b { color: red; } }\n`);
    await writeFile(join(dir, "part.css"), `.part { display: grid; }\n`);
    ctx.state.procs.styles = [];
    await (ctx.state as any).procs.boot.loaders.style(ctx, null, { entries: [{ routePath: "/app/theme.css", abs, root: dir, rel: "$style_theme.css" }] });

    const get = async () => {
        const res: Response = await ctx.state.procs.http.routes["/app/theme.css"]!.GET!(ctx);
        expect(res.headers.get("content-type")).toContain("text/css");
        return res.text();
    };
    // built on first request: the import inlined, the nesting flattened
    const first = await get();
    expect(first).toContain(".part{display:grid}");
    expect(first).toContain(".a .b{color:red}");

    await writeFile(join(dir, "part.css"), `.part { display: flex; }\n`);
    await ctx.fns.procs.dev.sync({ rel: "app/part.css" });
    expect(await get()).toContain(".part{display:flex}");
    const withImportEdit = await get();

    await writeFile(abs, `.c { color: blue; }\n`);
    expect(await get()).toBe(withImportEdit);  // kept in memory until rebuilt
    await ctx.fns.procs.styles.rebuild({});
    expect(await get()).toContain(".c{color:#00f}");

    // The real watcher reloads routes before compiling. Even then a broken
    // sheet keeps serving its last good build, without recompiling on GET.
    await writeFile(abs, `@import "./missing.css";\n`);
    ctx.env.NODE_ENV = "production";
    (ctx.state as any).procs.boot.entries = [{ kind: "style", routePath: "/app/theme.css", abs, root: dir, rel: "$style_theme.css" }];
    await ctx.fns.procs.http.loadRoutes({});
    await ctx.fns.procs.styles.rebuild({});
    expect(await get()).toContain(".c{color:#00f}");
});
