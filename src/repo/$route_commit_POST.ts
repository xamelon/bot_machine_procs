// Commit every change except submodules with the form's message.
export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    return ctx.fns.repo.act({ run: async () => {
        const form = await opts.req.formData();
        const { commit } = await ctx.fns.repo.commit({ message: String(form.get("message") ?? "") });
        return `Committed ${commit}`;
    } });
}
