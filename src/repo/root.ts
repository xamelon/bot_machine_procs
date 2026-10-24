// The checkout this admin commits: the app root, unless a test pointed
// `ctx.state.repo.root` elsewhere.
export default function (ctx: Context, _session: Session | null, _opts: {}): string {
    const root = ctx.state.repo?.root ?? ctx.state.root;
    if (!root) throw new Error("No app root");
    return root;
}
