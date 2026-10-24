// Connect GitHub: the form's repository becomes `origin`, with this bot's deploy key.
export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    return ctx.fns.repo.act({ run: async () => {
        const form = await opts.req.formData();
        const repo = await ctx.fns.repo.connect({ url: String(form.get("url") ?? "") });
        return `Connected to ${repo.owner}/${repo.name}. Add the deploy key on GitHub, then check the connection.`;
    } });
}
