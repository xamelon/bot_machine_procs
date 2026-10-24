import { realpath } from "node:fs/promises";

// Everything the Repository page shows, read from the bot's checkout: is it a
// repository of its own, its branch against the upstream, the changed files
// (submodules marked — they are never committed from here), the GitHub remote
// and the public half of the deploy key.
export default async function (ctx: Context, _session: Session | null, _opts: {}) {
    const git = ctx.fns.repo.git;
    const root = ctx.fns.repo.root({});
    const top = await git({ args: ["rev-parse", "--show-toplevel"] });
    // A checkout that belongs to a parent repository is not this bot's to commit.
    const real = (p: string) => realpath(p).catch(() => p);
    if (!top.ok || await real(top.out.trim()) !== await real(root)) return { repo: false as const, root };

    const status = await git({ args: ["status", "--porcelain=v1", "--branch", "-z"] });
    const entries = status.out.split("\0").filter(Boolean);
    const head = entries[0]?.startsWith("## ") ? entries.shift()!.slice(3) : "";
    // "main...origin/main [ahead 1, behind 2]", "No commits yet on main", "HEAD (no branch)"
    const [, branchPart = head, upstream = ""] = head.match(/^(.*?)(?:\.\.\.(\S+))?(?: \[.*\])?$/) ?? [];
    const branch = branchPart.replace(/^No commits yet on /, "");
    const ahead = Number(head.match(/ahead (\d+)/)?.[1] ?? 0);
    const behind = Number(head.match(/behind (\d+)/)?.[1] ?? 0);

    const modules = await ctx.fns.repo.submodules({});
    const files: Array<{ code: string; path: string; from?: string; submodule: boolean }> = [];
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i] ?? "";
        const code = entry.slice(0, 2), path = entry.slice(3);
        // A rename or copy is followed by its old path.
        const from = /[RC]/.test(code) ? entries[++i] : undefined;
        // Untracked, a submodule's folder comes as `path/`; anything under it is the submodule's too.
        const bare = path.replace(/\/$/, "");
        files.push({ code, path, from, submodule: modules.some(m => bare === m || bare.startsWith(`${m}/`)) });
    }

    const remote = (await git({ args: ["remote", "get-url", "origin"] })).out.trim();
    const key = await Bun.file(`${ctx.fns.repo.keyPath({})}.pub`).text().catch(() => "");
    return {
        repo: true as const, root, branch, upstream, ahead, behind, files, remote,
        github: ctx.fns.repo.github({ url: remote }),
        key: key.trim(),
    };
}
