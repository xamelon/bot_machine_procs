// The signed-in operator's repositories this admin could connect: only those
// they administer, because adding a deploy key takes admin rights. Most
// recently pushed first, at most 100.
export default async function (ctx: Context, _session: Session | null, _opts: {}) {
    const flow = ctx.fns.repo.signInState({});
    if (!flow?.token) throw new Error("Sign in to GitHub first");
    const repos = await ctx.fns.repo.githubCall({ path: "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member", token: flow.token });
    return (Array.isArray(repos) ? repos : [])
        .filter((r: any) => r?.permissions?.admin)
        .map((r: any) => ({ fullName: String(r.full_name), private: Boolean(r.private), empty: !r.pushed_at || r.size === 0 }));
}
