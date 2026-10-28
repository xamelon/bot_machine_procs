import { test, expect } from "bun:test";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import appTools from "./tools";

test("an external app can inspect core/ but cannot edit it or escape either tree", async () => {
    const root = await mkdtemp(join(tmpdir(), "external-bot-"));
    try {
        await mkdir(join(root, "src"));
        const ext = await appTools(root);
        const call = (name: string, args: any) => ext.tools!.find(t => t.name === name)!.execute(args, {} as any, {} as any);
        const text = (await call("read", { path: "core/src/$main.ts" })).output[0].text;
        expect(text).toContain("export async function boot");
        expect((await call("list", {})).output[0].text).toContain("core/src/procs/PROCS.md");
        await expect(call("read", { path: "core/src/procs" })).rejects.toThrow("core/src/procs/PROCS.md");
        await expect(call("read", { path: "src" })).rejects.toThrow("is a directory");
        for (const path of ["core/src/$main.ts", "core/new.ts", "core/../outside", "core/node_modules/bun/package.json", "core/.env", "core/.runtime/password"]) {
            await expect(call("write", { path, content: "bad" })).rejects.toThrow("read-only");
        }
        for (const path of ["core/../outside", "core/.env", "core/.git/config", "core/node_modules/bun/package.json", "core/.runtime/password"]) {
            await expect(call("read", { path })).rejects.toThrow("Only core source");
        }
        await symlink(resolve(import.meta.dir, "../src"), join(root, "src/alias"));
        await expect(call("write", { path: "src/alias/new.ts", content: "bad" })).rejects.toThrow();
        await expect(call("read", { path: "src/alias/$main.ts" })).rejects.toThrow();
        await expect(call("edit", { path: "core/src/$main.ts", oldText: "export async function boot(", newText: "bad" })).rejects.toThrow("read-only");
        await call("write", { path: "app/hello.ts", content: "export default function () { return 1; }" });
        expect((await call("read", { path: "src/app/hello.ts" })).output[0].text).toContain("return 1");
    } finally { await rm(root, { recursive: true, force: true }); }
});
