// Commit every change in the bot's checkout except its submodules: stage the
// rest (`git add -A`, submodule paths excluded) and commit the index with
// `message`. The author is the checkout's configured git identity; with none,
// the signed-in operator. Returns the new commit, or throws a readable error.
export default async function (ctx: Context, session: Session | null, opts: { message: string }) {
    const message = String(opts.message ?? "").trim();
    if (!message) throw new Error("Write a commit message");
    const git = ctx.fns.repo.git;
    const excluded = (await ctx.fns.repo.submodules({})).map(path => `:(exclude)${path}`);
    const added = await git({ args: ["add", "-A", "--", ".", ...excluded] });
    if (!added.ok) throw new Error(added.err || "git add failed");
    if ((await git({ args: ["diff", "--cached", "--quiet"] })).ok) throw new Error("Nothing to commit");

    const identity: string[] = [];
    if (!(await git({ args: ["config", "user.email"] })).out.trim()) {
        const user = session?.user;
        const login = (user?.login || "admin").replace(/[^A-Za-z0-9._-]/g, "") || "admin";
        identity.push("-c", `user.name=${user?.name || login}`, "-c", `user.email=${login}@bot.local`);
    }
    const done = await git({ args: [...identity, "commit", "--quiet", "-m", message] });
    if (!done.ok) throw new Error(done.err || done.out.trim() || "git commit failed");
    const head = await git({ args: ["log", "-1", "--format=%h %s"] });
    return { commit: head.out.trim() };
}
