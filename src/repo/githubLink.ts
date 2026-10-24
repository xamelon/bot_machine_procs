import { hostname } from "node:os";

// Finish "Connect GitHub" by signing in: with the operator's token, create the
// repository if asked (`create`, private unless `public`), connect the
// checkout to it (`repo.connect`: deploy key, origin, ssh command), add the
// public key to it as a write deploy key, and forget the token. What stays is
// the key — access to this one repository and nothing else. A failed attempt
// keeps the token for another try; it still expires with the sign-in.
export default async function (ctx: Context, _session: Session | null, opts: { repo?: string; create?: string; public?: boolean }) {
    const flow = ctx.fns.repo.signInState({});
    if (!flow?.token) throw new Error("Sign in to GitHub first");
    const token = flow.token;
    let fullName = String(opts.repo ?? "");
    if (opts.create) {
        const name = String(opts.create).trim();
        if (!/^[A-Za-z0-9._-]{1,100}$/.test(name)) throw new Error("A repository name is letters, digits, dots, dashes and underscores");
        const made = await ctx.fns.repo.githubCall({ path: "/user/repos", token, body: { name, private: !opts.public, auto_init: false } });
        fullName = made.full_name;
    }
    const target = ctx.fns.repo.github({ url: fullName });
    if (!target) throw new Error("Choose a repository");
    const { key } = await ctx.fns.repo.connect({ url: target.ssh });
    // GitHub refuses a key twice on one repository: add it only if it is not there.
    const keys = await ctx.fns.repo.githubCall({ path: `/repos/${target.owner}/${target.name}/keys`, token });
    const body = (k: string) => k.trim().split(/\s+/).slice(0, 2).join(" ");
    if (!(Array.isArray(keys) && keys.some((k: any) => body(String(k.key ?? "")) === body(key)))) {
        const bot = ctx.fns.repo.root({}).split("/").pop() || "bot";
        await ctx.fns.repo.githubCall({ path: `/repos/${target.owner}/${target.name}/keys`, token, body: { title: `${bot} admin (${hostname()})`, key, read_only: false } });
    }
    delete ctx.state.repo?.github;
    return target;
}
