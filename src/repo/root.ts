// The checkout this admin commits: REPO_ROOT when the app runs from elsewhere
// (Docker: /app, with the checkout mounted at its own path), else the app root.
// A test points `ctx.state.repo.root` at a scratch repository.
export default function (ctx: Context, _session: Session | null, _opts: {}): string {
    const root = ctx.state.repo?.root || ctx.fns.procs.config.resolve({ module: "repo" }).root || ctx.state.root;
    if (!root) throw new Error("No app root");
    return root;
}
