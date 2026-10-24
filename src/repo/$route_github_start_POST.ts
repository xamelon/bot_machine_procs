// Connect GitHub by signing in: get a one-time code for github.com/login/device.
export default async function (ctx: Context, _session: Session | null, _opts: {}) {
    return ctx.fns.repo.act({ run: async () => {
        const { userCode } = await ctx.fns.repo.signIn({});
        return `Enter ${userCode} on GitHub, then press Continue.`;
    } });
}
