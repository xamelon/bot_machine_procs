// A GitHub repository named any usual way — `owner/repo`, `github.com/owner/repo`,
// the https or ssh URL — as `{ owner, name, ssh, web }`, or null for anything
// that is not one. Pushing goes over ssh with the deploy key, so the remote is
// always written as `git@github.com:owner/repo.git`.
export default function (_ctx: Context, _session: Session | null, opts: { url: string }) {
    const text = String(opts.url ?? "").trim();
    const match = text.match(/^(?:(?:https:\/\/|ssh:\/\/git@)?github\.com[/:]|git@github\.com:)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/);
    if (!match) return null;
    const [, owner, name] = match;
    if (name === "." || name === "..") return null;
    return { owner, name, ssh: `git@github.com:${owner}/${name}.git`, web: `https://github.com/${owner}/${name}` };
}
