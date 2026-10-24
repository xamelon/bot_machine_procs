// Use the chosen repository — or a new one — and add this bot's deploy key to it.
export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    return ctx.fns.repo.act({ run: async () => {
        const form = await opts.req.formData();
        const create = String(form.get("create") ?? "").trim();
        const target = await ctx.fns.repo.githubLink(create
            ? { create, public: form.get("visibility") === "public" }
            : { repo: String(form.get("repo") ?? "") });
        const fetched = await ctx.fns.repo.git({ args: ["fetch", "--quiet", "--prune", "origin"], timeoutMs: 30_000 });
        return fetched.ok
            ? `Connected to ${target.owner}/${target.name}: the deploy key is on GitHub and works.`
            : `Connected to ${target.owner}/${target.name} and added the deploy key, but fetching failed: ${ctx.fns.repo.explain({ err: fetched.err })}`;
    } });
}
