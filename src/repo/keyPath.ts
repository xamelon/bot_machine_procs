// Where this bot keeps its GitHub deploy key: the app's `.runtime/git/`, beside
// its other credentials and outside editable src. `.pub` is the half shown.
export default function (ctx: Context, _session: Session | null, _opts: {}) {
    return `${ctx.fns.repo.root({})}/.runtime/git/id_ed25519`;
}
