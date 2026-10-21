import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { testCtx } from "./$test";

const root = resolve(import.meta.dir, "..");

test("bot and framework load from one local src tree without a procs package", async () => {
    const ctx = await testCtx({ env: { PROCS_PLUGINS: "" } });
    try {
        expect(ctx.fns.procs.project.projectRoot({})).toBe(root);
        const roots = await ctx.fns.procs.modules.discover({});
        expect(roots.filter(r => r.self).map(r => r.dir)).toEqual([resolve(root, "src")]);
        const entries = await ctx.fns.procs.project.scan({});
        for (const rel of ["procs/boot/load.ts", "bot/pending.ts", "bot/nav.ts"]) {
            expect(entries.filter(e => e.projectRel === rel).map(e => e.abs)).toEqual([resolve(root, "src", rel)]);
        }
        const pkg = await Bun.file(resolve(root, "package.json")).json();
        expect(pkg.dependencies.procs).toBeUndefined();
        expect(await Bun.file(resolve(root, "node_modules/procs/package.json")).exists()).toBe(false);
        for (const url of ["/bot/channels", "/procs/ui/htmx.js", "/procs/styles/font/latin.woff2"]) {
            const response = await ctx.fns.procs.http.dispatch({ url });
            expect(response.status).toBe(200);
        }
    } finally {
        ctx.fns.procs.db.close({});
    }
});
