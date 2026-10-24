// Check connection: fetch origin with the deploy key. Success proves GitHub
// accepts the key (not yet that it may write — a push tells that) and
// refreshes how far behind the branch is.
export default async function (ctx: Context, _session: Session | null, _opts: {}) {
    return ctx.fns.repo.act({ run: async () => {
        const fetched = await ctx.fns.repo.git({ args: ["fetch", "--quiet", "--prune", "origin"], timeoutMs: 30_000 });
        if (!fetched.ok) throw new Error(ctx.fns.repo.explain({ err: fetched.err }));
        return "GitHub accepts the key.";
    } });
}
