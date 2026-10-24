import { test, expect } from "bun:test";
import { mkdtemp, mkdir, symlink, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import appTools from "./tools";

test("app tools read the shared core, but write only app src", async () => {
    const root = await mkdtemp(join(tmpdir(), "procs-tools-"));
    try {
        await mkdir(join(root, "src")); await mkdir(join(root, "procs"));
        await mkdir(join(root, "src", "app"));
        await Bun.write(join(root, "src", "app", "hello.ts"), "export default 1;");
        await symlink(join(root, "procs"), join(root, "src", "escape"));
        await mkdir(join(root, "src", "bot_machine"));
        await Bun.write(join(root, "src", "bot_machine", "core.ts"), "export default 1;");
        await symlink(join(root, "src", "bot_machine"), join(root, "src", "core_alias"));
        const ext = await appTools(root);
        const tool = (name: string) => ext.tools!.find(t => t.name === name)!;
        const call = (name: string, args: any) => tool(name).execute(args, {} as any, {} as any);
        // A root-relative escape is refused, a src-relative one is app code by definition.
        await expect(call("write", { path: "../outside.ts", content: "bad" })).rejects.toThrow("Only src/");
        await expect(call("write", { path: "src/../procs/core.ts", content: "bad" })).rejects.toThrow("Only src/");
        await expect(call("write", { path: "src/escape/core.ts", content: "bad" })).rejects.toThrow("Only src/");
        // The shared core is readable, directly and through a symlink…
        expect((await call("read", { path: "src/bot_machine/core.ts" })).output[0].text).toBe("export default 1;");
        expect((await call("read", { path: "src/core_alias/core.ts" })).output[0].text).toBe("export default 1;");
        // …but never writable, and a read outside src is still refused.
        for (const path of ["src/bot_machine/core.ts", "src/bot_machine/new/file.ts", "src/core_alias/core.ts", "src/core_alias/new/file.ts"]) {
            await expect(call("write", { path, content: "export default 2;" })).rejects.toThrow("read-only");
            await expect(call("edit", { path, oldText: "1", newText: "2" })).rejects.toThrow();
        }
        await expect(call("read", { path: "../outside.ts" })).rejects.toThrow("Only src/");
        // A guessed path names where the same file actually is, or says how to look.
        await Bun.write(join(root, "src", "$main.ts"), "export default 1;");
        await expect(call("read", { path: "app/$main.ts" })).rejects.toThrow('Did you mean "src/$main.ts"');
        await expect(call("edit", { path: "app/$main.ts", oldText: "a", newText: "b" })).rejects.toThrow('Did you mean "src/$main.ts"');
        await expect(call("read", { path: "app/nothing_like_it.ts" })).rejects.toThrow("Use the list tool");
        await expect(call("read", { path: "app/no_such_dir/file.ts" })).rejects.toThrow("Use the list tool");
        // A directory answers with what is in it, not with EISDIR.
        await mkdir(join(root, "src", "app", "parts"));
        await Bun.write(join(root, "src", "app", "parts", "one.ts"), "export default 1;");
        for (const path of ["app/parts", "src/app/parts", "app/parts/"]) {
            await expect(call("read", { path })).rejects.toThrow(/is a directory, not a file.*src\/app\/parts\/one\.ts/s);
        }
        await expect(call("edit", { path: "app/parts", oldText: "a", newText: "b" })).rejects.toThrow("is a directory");
        await expect(call("read", { path: "src/escape/core.ts" })).rejects.toThrow("Only src/");
        expect(await readFile(join(root, "src", "bot_machine", "core.ts"), "utf8")).toBe("export default 1;");
        await expect(call("write", { path: "src/broken.ts", content: "export default function (" })).rejects.toThrow();
        await call("write", { path: "src/test.ts", content: "export default function () { return 1; }" });
        // An edit that cannot land says why, so the model re-reads instead of retrying blindly.
        await expect(call("edit", { path: "src/test.ts", oldText: "return 9", newText: "return 3" })).rejects.toThrow("copy the exact text");
        await Bun.write(join(root, "src", "twice.ts"), "const a = 1;\nconst a = 1;\n");
        await expect(call("edit", { path: "src/twice.ts", oldText: "const a = 1;", newText: "const a = 2;" })).rejects.toThrow("appears 2 times");
        await call("edit", { path: "src/test.ts", oldText: "return 1", newText: "return 2" });
        expect(await readFile(join(root, "src", "test.ts"), "utf8")).toContain("return 2");

        // `list` names files from the project root, and both spellings read the
        // same file: dropping the `src/` prefix is the caller's most common slip.
        const listing = (await call("list", {})).output[0].text.split("\n");
        expect(listing).toContain("src/app/hello.ts");
        for (const path of ["src/app/hello.ts", "app/hello.ts"]) {
            expect((await call("read", { path })).output[0].text).toBe("export default 1;");
        }
        await call("write", { path: "app/created.ts", content: "export default 3;" });
        expect(await readFile(join(root, "src", "app", "created.ts"), "utf8")).toBe("export default 3;");
        await expect(call("read", { path: "app/hello.ts" })).resolves.toBeDefined();
        await expect(call("write", { path: "bot_machine/core.ts", content: "export default 2;" })).rejects.toThrow("read-only");
        expect(ext.tools!.some(t => t.name === "bash")).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("the prompt states which tools exist, and what they are for", async () => {
    const root = await mkdtemp(join(tmpdir(), "procs-section-"));
    const previous = process.env.AGENT_REPL;
    try {
        await mkdir(join(root, "src"));
        process.env.AGENT_REPL = "0";
        const off = (await appTools(root)).sections!.find(s => s.key === "tools")!;
        const offText = await off.render({} as any, {} as any);
        expect(offText).toContain("list, read, write, edit");
        expect(offText).toContain("`repl` is switched off");
        expect(offText).not.toContain("evaluate code in the RUNNING app");

        process.env.AGENT_REPL = "1";
        const onText = await (await appTools(root)).sections!.find(s => s.key === "tools")!.render({} as any, {} as any);
        expect(onText).toContain("list, read, write, edit, repl");
        expect(onText).toContain("evaluate code in the RUNNING app");
        expect(onText).toContain("ctx.fns.bot.save");
        expect(onText).toContain("ctx.fns.procs.db.select");
        expect(onText).toContain("never print values from ctx.env");
        // The whole framework is reachable there, and discovery beats guessing.
        expect(onText).toContain("Object.keys(ctx.fns)");
        expect(onText).toContain("ctx.fns.procs.dev.doc");
        expect(onText).toContain("src/bot_machine/src/procs/PROCS.md");
        // The runtime and its limits, so the model does not reach for a shell.
        expect(onText).toContain("Bun (1.3+), not Node");
        expect(onText).toContain("no shell tool");
        expect(onText).toContain("SYNCHRONOUS");
        expect(onText).toContain("pragma table_info");
    } finally {
        if (previous === undefined) delete process.env.AGENT_REPL; else process.env.AGENT_REPL = previous;
        await rm(root, { recursive: true, force: true });
    }
});

test("the repl tool is off unless the operator enables it, and then uses this run's token", async () => {
    const root = await mkdtemp(join(tmpdir(), "procs-repl-"));
    const previous = process.env.AGENT_REPL;
    try {
        await mkdir(join(root, "src")); await mkdir(join(root, ".runtime"));
        process.env.AGENT_REPL = "0";
        const off = await appTools(root);
        await expect(off.tools!.find(t => t.name === "repl")!.execute({ code: "1" }, {} as any, {} as any)).rejects.toThrow("AGENT_REPL=1");

        const seen: any[] = [];
        const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: async (req) => {
            seen.push({ auth: req.headers.get("authorization"), code: await req.text() });
            return Response.json({ success: true, return: 42 });
        } });
        try {
            await Bun.write(join(root, ".runtime", "port"), String(server.port));
            await Bun.write(join(root, ".runtime", "repl-token"), "token-for-this-run");
            process.env.AGENT_REPL = "1";
            const on = await appTools(root);
            const text = (await on.tools!.find(t => t.name === "repl")!.execute({ code: "ctx.fns.procs.dev.lint({})" }, {} as any, {} as any)).output[0].text;
            expect(JSON.parse(text).return).toBe(42);
            expect(seen).toEqual([{ auth: "Bearer token-for-this-run", code: "ctx.fns.procs.dev.lint({})" }]);
        } finally { server.stop(true); }
    } finally {
        if (previous === undefined) delete process.env.AGENT_REPL; else process.env.AGENT_REPL = previous;
        await rm(root, { recursive: true, force: true });
    }
});
