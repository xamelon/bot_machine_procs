// No shell or arbitrary evaluation. The app src is editable; the shared core
// submodule below it is readable (you cannot make an honest app edit against code
// you cannot see) but never writable — shared changes belong in the core
// repository, not in a consuming app. Inspecting the running app, its database
// included, is the REPL tool's job.
import { realpath, mkdir, readdir, stat } from "node:fs/promises";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { Type } from "@earendil-works/pi-ai";
import { defineExtension, defineTool, section } from "@earendil-works/pi-durable";

export default async function (root: string) {
    root = await realpath(root);
    const src = await realpath(resolve(root, "src"));
    const core = await realpath(resolve(import.meta.dir, ".."));
    const legacyCore = await realpath(resolve(src, "bot_machine")).catch(() => resolve(src, "bot_machine"));
    const within = (base: string, p: string) => p === base || p.startsWith(base + "/");
    const corePath = (p: string) => {
        if (!within(core, p) || relative(core, p).split("/").some(part => [".git", ".runtime", "node_modules"].includes(part) || part.startsWith(".env"))) {
            throw new Error("Only core source and documentation are readable");
        }
    };
    const repl = process.env.AGENT_REPL === "1";
    const inCore = (p: string) => within(core, p) || within(legacyCore, p);
    const insideSrc = (p: string) => {
        const rel = relative(src, p);
        return !(rel === ".." || rel.startsWith("../") || isAbsolute(rel));
    };
    // `list` prints paths under src and a caller may drop that prefix, so both
    // `src/app/x.ts` and `app/x.ts` name the same file: a path that starts with
    // `src/` is read from the project root, everything else from `src`. Neither
    // spelling can leave src.
    async function pathFor(path: string, create = false) {
        if (path === "core" || path.startsWith("core/")) {
            if (create) throw new Error("The shared core is read-only: change it in the core repository");
            const target = resolve(core, path.slice(4).replace(/^\//, "") || ".");
            corePath(target);
            corePath(await realpath(target));
            return target;
        }
        const target = path === "src" || path.startsWith("src/") || isAbsolute(path) ? resolve(root, path) : resolve(src, path);
        const inside = (p: string) => {
            if (!insideSrc(p)) throw new Error("Only src/ files are accessible: name them from the project root, e.g. src/app/hook.ts");
            if (create && inCore(p)) throw new Error("The shared core is read-only: change it in the core repository");
        };
        inside(target);
        // Resolve each existing ancestor before mkdir/write, refusing symlink escapes.
        let parent = target === src ? target : dirname(target);
        while (true) {
            try { inside(await realpath(parent)); break; }
            catch (e: any) { if (e.code !== "ENOENT") throw e; parent = dirname(parent); }
        }
        try { inside(await realpath(target)); }
        catch (e: any) { if (e.code !== "ENOENT" || !create) throw e; }
        return target;
    }
    // Reading a directory is a wrong guess, not a broken app: answer with what is
    // in it, in the same root-relative spelling `list` uses.
    async function readText(path: string) {
        const target = await pathFor(path).catch((error) => missing(path, error));
        const info = await stat(target).catch(() => null);
        if (info?.isDirectory()) {
            const entries = (await readdir(target, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
            const isCore = path === "core" || path.startsWith("core/");
            const base = relative(isCore ? core : src, target).split("\\").join("/");
            const names = entries.filter(entry => !isCore || ![".git", ".runtime", "node_modules"].includes(entry.name) && !entry.name.startsWith(".env"))
                .map((entry) => `${isCore ? "core" : "src"}/${base ? base + "/" : ""}${entry.name}${entry.isDirectory() ? "/" : ""}`);
            const shown = names.slice(0, 40).join("\n");
            throw new Error(`"${path}" is a directory, not a file. It contains:\n${shown}${names.length > 40 ? `\n… ${names.length - 40} more` : ""}`);
        }
        try { return await Bun.file(target).text(); }
        catch (error) { return await missing(path, error); }
    }
    // A guessed path is the commonest failure: name the file the caller probably
    // meant instead of leaving it with a bare ENOENT.
    async function missing(path: string, error: any) {
        if (error?.code !== "ENOENT") throw error;
        const name = path.split("/").pop() ?? "";
        const hits: string[] = [];
        if (name) {
            for await (const hit of new Bun.Glob(`**/${name}`).scan(src)) {
                hits.push(`src/${hit}`);
                if (hits.length === 3) break;
            }
        }
        const hint = hits.length
            ? `Did you mean ${hits.map((hit) => `"${hit}"`).join(" or ")}?`
            : "Use the list tool to see what is there.";
        throw new Error(`No file "${path}". ${hint}`);
    }
    async function save(path: string, content: string) {
        const target = await pathFor(path, true);
        if (/\.(ts|tsx|js|jsx)$/.test(target)) new Bun.Transpiler({ loader: target.endsWith("tsx") ? "tsx" : "ts" }).transformSync(content);
        await mkdir(dirname(target), { recursive: true });
        await Bun.write(target, content);
    }
    // The registry hands the model its tool schemas, and a smaller model all too
    // easily answers "I have no such tool" instead of looking. This section states
    // the same inventory in the prompt itself, and says what each one is for.
    const inventory = section("tools", () => [
        "You have exactly these tools right now, and you call them by name: list, read, write, edit" + (repl ? ", repl." : ". There is no other tool, and `repl` is switched off for this run."),
        "- list: application files under src/ and shared core source under core/ (read-only).",
        "- read: read a file under src/ or the shared core (read-only). src/app/x.ts and app/x.ts both work.",
        "- write, edit: change app src only. The shared core is read-only.",
        "- Layout: core/src/$main.ts boots the shared core and the application's src/. src/app/ holds bot-specific code. core/ is a virtual read-only view of the core, not a folder in the application.",
        "- Runtime: this app runs on Bun (1.3+), not Node — Bun.file, Bun.Glob, bun:sqlite, tests via `bun test`. You have no shell tool of your own: a command, a script or the suite runs only by evaluating it in repl.",
        repl ? [
            "- repl: evaluate code in the RUNNING app with ctx in scope, and that covers far more than the database: every module the app mounts is callable there.",
            "  Inside it: ctx.fns.procs.db.select/run/insert are SYNCHRONOUS — no await, no .catch, they return rows or the inserted row. Do not invent helpers: a missing name throws `no such function`, so check Object.keys. Before SQL, learn the schema: pragma table_info(<table>), or select name from sqlite_master.",
            "  Discover it instead of guessing: Object.keys(ctx.fns) lists the namespaces (procs.db, procs.http, procs.ui, bot, ui, and the app's own), Object.keys(ctx.fns.bot) lists a module's functions, ctx.fns.procs.dev.doc({ q: \"flow\" }) searches docstrings, ctx.fns.procs.dev.where({ name: \"bot.save\" }) names a function's file, and core/src/procs/PROCS.md is the contract — read it.",
            "  Examples: ctx.fns.procs.db.select({ sql, params }), await ctx.fns.bot.save({ definition }) to change a flow, ctx.fns.bot.match(...), ctx.fns.procs.ui.table(...). Read freely; do not write data, files or messages through it unless the task is exactly that, and never print values from ctx.env or credentials.",
            "  Git: the app's checkout is ctx.fns.repo.root({}), not necessarily the folder the app runs from (in Docker the app runs from /app and the checkout is mounted at REPO_ROOT; /app has no .git). Commit and push only when the operator asks, and through these: await ctx.fns.repo.status({}) (branch, ahead/behind, changed files), await ctx.fns.repo.commit({ message }) (everything except submodules), await ctx.fns.repo.push({}) (no force). For anything else run git with cwd: ctx.fns.repo.root({}), e.g. await ctx.fns.repo.git({ args: [\"log\", \"-5\", \"--oneline\"] }).",
        ].join("\n") : "",
    ].filter(Boolean).join("\n"));
    return defineExtension({ name: "app", sections: [inventory], tools: [
        defineTool({ name: "list", description: "List application src/ and read-only core/ source files", parameters: Type.Object({}), replay: "safe", execute: async () => ({ output: [{ type: "text", text: [...(await readdir(src, { recursive: true })).map((name) => `src/${name}`), ...(await Array.fromAsync(new Bun.Glob("{src,supervisor,assets,script,docs}/**/*").scan({ cwd: core, onlyFiles: true }))).filter(name => !name.split("/").some(part => [".git", ".runtime", "node_modules"].includes(part) || part.startsWith(".env"))).map(name => `core/${name}`)].join("\n") }] }) }),
        defineTool({ name: "read", description: "Read a file under src/ or core/ (read-only); src/app/x.ts and app/x.ts both work; a directory answers with its contents", parameters: Type.Object({ path: Type.String() }), replay: "safe", execute: async ({ path }) => ({ output: [{ type: "text", text: await readText(path) }] }) }),
        defineTool({ name: "write", description: "Write a src/ file, checking syntax first", parameters: Type.Object({ path: Type.String(), content: Type.String() }), execute: async ({ path, content }) => { await save(path, content); return { output: [{ type: "text", text: `Saved ${path}` }] }; } }),
        defineTool({ name: "edit", description: "Replace exactly one matching region in a src/ file", parameters: Type.Object({ path: Type.String(), oldText: Type.String(), newText: Type.String() }), execute: async ({ path, oldText, newText }) => {
            const content = await readText(path);
            if (!oldText) throw new Error("oldText must not be empty");
            const occurrences = content.split(oldText).length - 1;
            if (occurrences === 0) throw new Error(`oldText is not in ${path}: read the file and copy the exact text, whitespace included`);
            if (occurrences > 1) throw new Error(`oldText appears ${occurrences} times in ${path}: include more surrounding lines so it is unique`);
            await save(path, content.replace(oldText, newText));
            return { output: [{ type: "text", text: `Edited ${path}` }] };
        } }),
        // The framework's own inspection tool, kept behind an operator switch: it
        // evaluates arbitrary code in the running app, so it is not on by default.
        defineTool({ name: "repl", description: "Evaluate code in the running app with ctx in scope — arbitrary code, use it to inspect and debug", parameters: Type.Object({ code: Type.String() }), execute: async ({ code }) => {
            if (!repl) throw new Error("REPL is off for this agent: start the supervisor with AGENT_REPL=1 to enable it");
            return { output: [{ type: "text", text: await runRepl(root, code) }] };
        } }),
    ] });
}

// Same protocol as script/repl.ts: this run's port and its `kind: "repl"` token,
// read per call because both change when the runtime restarts.
async function runRepl(root: string, code: string) {
    const runtimeDir = resolve(root, ".runtime");
    const port = (await Bun.file(resolve(runtimeDir, "port")).text().catch(() => "")).trim();
    if (!port) throw new Error("The app is not running: no .runtime/port");
    const token = (await Bun.file(resolve(runtimeDir, "repl-token")).text().catch(() => "")).trim();
    const res = await fetch(`http://127.0.0.1:${port}/procs/repl`, {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: code,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`REPL ${res.status}: ${text}`);
    return text;
}

