import { mkdir, chmod, rm } from "node:fs/promises";
import { dirname } from "node:path";

// GitHub's published host keys (api.github.com/meta, `ssh_keys`). Pinned rather
// than trusted on first use, so the deploy key is only ever offered to GitHub.
const GITHUB_HOST_KEYS = [
    "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl",
    "github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=",
];

// Connect the bot's checkout to a GitHub repository: create its deploy key once
// (ed25519, no passphrase, in the app's `.runtime/git/`), make `origin` the
// repository's ssh URL and set `core.sshCommand` in the checkout's own config to
// that key and the pinned host keys. From then on a plain `git push` from the
// checkout — this page, the agent's repl, a terminal — authenticates as the key.
//
// GitHub accepts a deploy key on one repository only, so moving to another
// repository makes a new key; reconnecting the same one keeps it.
export default async function (ctx: Context, _session: Session | null, opts: { url: string }) {
    const repo = ctx.fns.repo.github({ url: opts.url });
    if (!repo) throw new Error("Not a GitHub repository. Use owner/repo or git@github.com:owner/repo.git");
    const git = ctx.fns.repo.git;
    const key = ctx.fns.repo.keyPath({});
    const dir = dirname(key);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await chmod(dir, 0o700);
    const current = ctx.fns.repo.github({ url: (await git({ args: ["remote", "get-url", "origin"] })).out.trim() });
    if (current && current.ssh.toLowerCase() !== repo.ssh.toLowerCase()) {
        await rm(key, { force: true });
        await rm(`${key}.pub`, { force: true });
    }
    if (!(await Bun.file(key).exists())) {
        const name = ctx.fns.repo.root({}).split("/").pop() || "bot";
        const made = Bun.spawnSync(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", `${name} deploy key`, "-f", key], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
        if (made.exitCode !== 0) throw new Error(`ssh-keygen failed: ${made.stderr.toString().trim() || "is openssh installed?"}`);
    }
    await chmod(key, 0o600);
    const knownHosts = `${dir}/known_hosts`;
    await Bun.write(knownHosts, GITHUB_HOST_KEYS.join("\n") + "\n");

    const hasOrigin = (await git({ args: ["remote", "get-url", "origin"] })).ok;
    const remote = await git({ args: hasOrigin ? ["remote", "set-url", "origin", repo.ssh] : ["remote", "add", "origin", repo.ssh] });
    if (!remote.ok) throw new Error(remote.err || "Could not set origin");
    const quote = (path: string) => `'${path.replace(/'/g, `'\\''`)}'`;
    const ssh = `ssh -i ${quote(key)} -o IdentitiesOnly=yes -o UserKnownHostsFile=${quote(knownHosts)} -o StrictHostKeyChecking=yes`;
    const config = await git({ args: ["config", "core.sshCommand", ssh] });
    if (!config.ok) throw new Error(config.err || "Could not set core.sshCommand");
    return { ...repo, key: (await Bun.file(`${key}.pub`).text()).trim() };
}
