// Push the current branch to GitHub.
export default async function (ctx: Context, _session: Session | null, _opts: {}) {
    return ctx.fns.repo.act({ run: async () => {
        const { branch } = await ctx.fns.repo.push({});
        return `Pushed ${branch} to GitHub`;
    } });
}
