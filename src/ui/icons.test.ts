import { test, expect } from "bun:test";
import { resolve } from "node:path";
// The icon font is the full Phosphor set (assets/icons/phosphor-full.woff2, all
// 1530 glyphs), so any icon from phosphoricons.com draws without a rebuild. What
// can still go wrong is a name: a misspelt `ph-*` class is a blank square with no
// error. This test is the alarm — it collects every `ph-*` class the source can
// render and fails when phosphor.css has no glyph rule for it.
test("каждый ph-* класс, который может отрисовать приложение, есть в наборе иконок", async () => {
    const root = resolve(import.meta.dir, "../..");
    const css = await Bun.file(resolve(root, "assets/icons/phosphor.css")).text();
    const have = new Set([...css.matchAll(/\.ph-([a-z0-9-]+):before/g)].map(m => m[1]));
    expect(have.size).toBeGreaterThan(1000);                     // the full set, not a cut
    expect(css).toContain('url("/ui/phosphor-full.woff2")');
    const used = new Set<string>();
    for (const dir of ["src", "modules"]) {
        const glob = new Bun.Glob(`${dir}/**/*.{ts,js,json}`);
        for await (const rel of glob.scan({ cwd: root })) {
            if (rel.includes("node_modules") || rel.includes(".runtime")) continue;
            for (const match of (await Bun.file(resolve(root, rel)).text()).matchAll(/\bph-[a-z0-9][a-z0-9-]*/g)) used.add(match[0]);
        }
    }
    expect(used.size).toBeGreaterThan(10);                       // the scan actually saw the app
    const missing = [...used].filter(name => !have.has(name.slice(3))).sort();
    expect(missing).toEqual([]);
});
