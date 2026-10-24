// Push the current branch to `origin` and track it. Never forces: when GitHub
// has commits this checkout lacks, the push is refused and the error says so.
export default async function (ctx: Context, _session: Session | null, _opts: {}) {
    const git = ctx.fns.repo.git;
    const branch = (await git({ args: ["symbolic-ref", "--quiet", "--short", "HEAD"] })).out.trim();
    if (!branch) throw new Error("Not on a branch: check out one before pushing");
    if (!(await git({ args: ["remote", "get-url", "origin"] })).ok) throw new Error("Connect GitHub first");
    const pushed = await git({ args: ["push", "--porcelain", "-u", "origin", `HEAD:refs/heads/${branch}`], timeoutMs: 60_000 });
    if (!pushed.ok) throw new Error(ctx.fns.repo.explain({ err: pushed.err || pushed.out }));
    return { branch };
}
