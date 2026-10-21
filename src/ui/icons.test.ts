import { test, expect } from "bun:test";
import { resolve } from "node:path";

// The icon font is a subset: 72 glyphs out of 1530, 7 KB instead of 147 KB,
// because everything here is served through one machine's upload and the whole
// font is most of a first visit. The cost of a subset is silence — an icon that
// nobody cut is a blank square with no error — so this test is the alarm: it
// collects every `ph-*` class the source can render and fails when one of them
// was not in the manifest the subset was built from.
//
// To add an icon: rebuild with fontTools against the pinned full font —
//   pyftsubset assets/icons/phosphor-full.woff2 --flavor=woff2 \
//     --unicodes=$(jq -r '.icons[]' assets/icons/used.json | sed 's/^/0x/' | paste -sd,) \
//     --output-file=assets/icons/phosphor.woff2
// — then add the name and its codepoint to `used.json`.
test("шрифт иконок содержит каждый ph-* класс, который может отрисовать приложение", async () => {
    const root = resolve(import.meta.dir, "../..");
    const manifest = await Bun.file(resolve(root, "assets/icons/used.json")).json();
    const have = new Set(Object.keys(manifest.icons));

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
