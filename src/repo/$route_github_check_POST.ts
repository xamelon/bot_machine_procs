// Continue: has the operator entered the code on GitHub yet?
export default async function (ctx: Context, _session: Session | null, _opts: {}) {
    return ctx.fns.repo.act({ run: async () => {
        const status = await ctx.fns.repo.signInCheck({});
        if (status === "pending") throw new Error("GitHub has not confirmed yet: enter the code there, then press Continue again.");
        return `Signed in to GitHub as ${ctx.fns.repo.signInState({})?.login}. Choose the repository.`;
    } });
}
