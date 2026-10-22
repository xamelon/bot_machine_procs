import { test, expect } from "bun:test";
import { mkdtemp, mkdir, symlink, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import appTools from "./tools";

test("app tools refuse traversal, symlink escapes and invalid syntax", async () => {
    const root = await mkdtemp(join(tmpdir(), "procs-tools-"));
    try {
        await mkdir(join(root, "src")); await mkdir(join(root, "procs"));
        await symlink(join(root, "procs"), join(root, "src", "escape"));
        await mkdir(join(root, "src", "bot_machine"));
        await Bun.write(join(root, "src", "bot_machine", "core.ts"), "export default 1;");
        await symlink(join(root, "src", "bot_machine"), join(root, "src", "core_alias"));
        const ext = await appTools(root);
        const tool = (name: string) => ext.tools!.find(t => t.name === name)!;
        const call = (name: string, args: any) => tool(name).execute(args, {} as any, {} as any);
        await expect(call("write", { path: "procs/core.ts", content: "bad" })).rejects.toThrow("Only app");
        await expect(call("write", { path: "src/escape/core.ts", content: "bad" })).rejects.toThrow("Only app");
        for (const path of ["src/bot_machine/core.ts", "src/bot_machine/new/file.ts", "src/core_alias/core.ts", "src/core_alias/new/file.ts"]) {
            await expect(call("write", { path, content: "export default 2;" })).rejects.toThrow("Only app");
        }
        await expect(call("read", { path: "src/bot_machine/core.ts" })).rejects.toThrow("Only app");
        expect(await readFile(join(root, "src", "bot_machine", "core.ts"), "utf8")).toBe("export default 1;");
        await expect(call("write", { path: "src/broken.ts", content: "export default function (" })).rejects.toThrow();
        await call("write", { path: "src/test.ts", content: "export default function () { return 1; }" });
        await call("edit", { path: "src/test.ts", oldText: "return 1", newText: "return 2" });
        expect(await readFile(join(root, "src/test.ts"), "utf8")).toContain("return 2");
        expect(ext.tools!.some(t => t.name === "bash")).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
});
