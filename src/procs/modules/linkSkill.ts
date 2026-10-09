// Link one mounted module/skill folder into every coding-agent convention the
// workspace supports. Claude reads `.claude/skills`; current Codex discovers
// project skills under `.agents/skills`. Each location gets its own child
// symlinks rather than making `.agents/skills` itself a symlink: Codex refuses
// redirected skill roots during repository migration/discovery.
import { mkdir, symlink, lstat, readlink, unlink } from "node:fs/promises";
import { resolve } from "node:path";

export default async function (ctx: Context, _session: Session | null, opts: { name: string; folder: string; root: ".claude/skills" | ".agents/skills" }): Promise<{ linked: string | null; why?: string }> {
    const workdir = ctx.fns.procs.project.workdir({});
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(opts.name) || opts.name === "." || opts.name === "..") throw new Error("skill name must be one safe path segment");


    const skills = `${workdir}/${opts.root}`;
    const at = `${skills}/${opts.name}`;
    if (resolve(at) === resolve(opts.folder)) return { linked: null, why: "it already lives there" };

    await mkdir(skills, { recursive: true });
    const there = await lstat(at).catch(() => null);
    if (there?.isSymbolicLink()) {
        if (await readlink(at).catch(() => "") === opts.folder) return { linked: at };
        await unlink(at);
    } else if (there) {
        return { linked: null, why: "a real directory is already there — the project's own skill wins" };
    }

    await symlink(opts.folder, at, "dir");
    return { linked: at };
}
