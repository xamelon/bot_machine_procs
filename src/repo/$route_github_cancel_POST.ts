// Cancel a GitHub sign-in: forget its code and token.
export default async function (ctx: Context, _session: Session | null, _opts: {}) {
    return ctx.fns.repo.act({ run: async () => {
        delete ctx.state.repo?.github;
        return "GitHub sign-in cancelled.";
    } });
}
