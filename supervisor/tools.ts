// No shell or arbitrary evaluation: only regular files below app src are editable.
import { realpath, mkdir, readdir } from "node:fs/promises";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { Type } from "@earendil-works/pi-ai";
import { defineExtension, defineTool } from "@earendil-works/pi-durable";

export default async function (root: string) {
    root = await realpath(root);
    const src = await realpath(resolve(root, "src"));
    const core = await realpath(resolve(src, "bot_machine")).catch(() => resolve(src, "bot_machine"));
    async function pathFor(path: string, create = false) {
        const target = resolve(root, path);
        const inside = (p: string) => {
            const rel = relative(src, p);
            if (rel === ".." || rel.startsWith("../") || isAbsolute(rel)
                || p === resolve(src, "bot_machine") || p.startsWith(resolve(src, "bot_machine") + "/")
                || p === core || p.startsWith(core + "/")) throw new Error("Only app src/ files are accessible");
        };
        inside(target);
        // Resolve each existing ancestor before mkdir/write, refusing symlink escapes.
        let parent = dirname(target);
        while (true) {
            try { inside(await realpath(parent)); break; }
            catch (e: any) { if (e.code !== "ENOENT") throw e; parent = dirname(parent); }
        }
        try { inside(await realpath(target)); }
        catch (e: any) { if (e.code !== "ENOENT" || !create) throw e; }
        return target;
    }
    async function save(path: string, content: string) {
        const target = await pathFor(path, true);
        if (/\.(ts|tsx|js|jsx)$/.test(target)) new Bun.Transpiler({ loader: target.endsWith("tsx") ? "tsx" : "ts" }).transformSync(content);
        await mkdir(dirname(target), { recursive: true });
        await Bun.write(target, content);
    }
    return defineExtension({ name: "app-files", tools: [
        defineTool({ name: "list", description: "List files in app src", parameters: Type.Object({}), replay: "safe", execute: async () => ({ output: [{ type: "text", text: (await readdir(src, { recursive: true })).join("\n") }] }) }),
        defineTool({ name: "read", description: "Read an app src file", parameters: Type.Object({ path: Type.String() }), replay: "safe", execute: async ({ path }) => ({ output: [{ type: "text", text: await Bun.file(await pathFor(path)).text() }] }) }),
        defineTool({ name: "write", description: "Write an app src file, checking syntax first", parameters: Type.Object({ path: Type.String(), content: Type.String() }), execute: async ({ path, content }) => { await save(path, content); return { output: [{ type: "text", text: `Saved ${path}` }] }; } }),
        defineTool({ name: "edit", description: "Replace exactly one matching region in an app src file", parameters: Type.Object({ path: Type.String(), oldText: Type.String(), newText: Type.String() }), execute: async ({ path, oldText, newText }) => {
            const content = await Bun.file(await pathFor(path)).text();
            if (!oldText || content.split(oldText).length !== 2) throw new Error("oldText must match exactly once");
            await save(path, content.replace(oldText, newText));
            return { output: [{ type: "text", text: `Edited ${path}` }] };
        } }),
    ] });
}
