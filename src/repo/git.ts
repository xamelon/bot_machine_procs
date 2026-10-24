// Run one git command in the bot's own checkout and return what it said. No
// shell: the arguments go to git as they are. Never prompts — a missing
// credential fails instead of hanging the request — and gives up after
// `timeoutMs` (network commands pass a longer one).
export default async function (ctx: Context, _session: Session | null, opts: { args: string[]; timeoutMs?: number }) {
    const cwd = ctx.fns.repo.root({});
    const proc = Bun.spawn(["git", ...opts.args], {
        cwd,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0", LC_ALL: "C" },
        stdin: "ignore", stdout: "pipe", stderr: "pipe",
    });
    const timer = setTimeout(() => proc.kill(), opts.timeoutMs ?? 10_000);
    const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
    clearTimeout(timer);
    return { ok: code === 0, code, out, err: err.trim() || (proc.signalCode ? "git timed out" : "") };
}
