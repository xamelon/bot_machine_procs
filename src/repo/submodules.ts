// Paths of the checkout's submodules (the shared core among them). They are
// someone else's repositories: the Repository page never stages them.
export default async function (ctx: Context, _session: Session | null, _opts: {}) {
    const listed = await ctx.fns.repo.git({ args: ["config", "--file", ".gitmodules", "--get-regexp", "\\.path$"] });
    return listed.out.split("\n").map(line => line.split(" ").slice(1).join(" ").trim()).filter(Boolean);
}
