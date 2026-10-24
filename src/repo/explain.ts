// Turn what git and ssh print when GitHub says no into the step that fixes it;
// anything unrecognised comes back as git said it.
export default function (_ctx: Context, _session: Session | null, opts: { err: string }) {
    const err = String(opts.err ?? "").trim();
    if (/marked as read only|read-only/i.test(err)) return "The deploy key is read-only: on GitHub, delete it and add it again with “Allow write access” ticked.";
    if (/Permission denied \(publickey\)|Repository not found|Could not read from remote/i.test(err)) return "GitHub did not accept the key: add the deploy key below to this repository (Settings → Deploy keys, with “Allow write access”).";
    if (/\[rejected\]|non-fast-forward|fetch first/i.test(err)) return "GitHub has commits this copy does not: bring them in first (ask the agent to pull and merge), then push.";
    if (/Host key verification failed/i.test(err)) return "GitHub's host key did not match the pinned one: press Connect GitHub again.";
    return err.split("\n").filter(line => line.trim()).slice(-4).join(" ") || "git failed";
}
