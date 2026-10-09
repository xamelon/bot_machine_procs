// Take a plugin's skill link out of the project again — the other half of
// `modules.link`, run when a plugin is turned off.
//
// Only our own symlink is removed: a real directory by that name is the
// project's own skill, and un-asking for a module is not permission to delete
// somebody's files.
import { lstat, unlink } from "node:fs/promises";

export default async function (ctx: Context, _session: Session | null, opts: { name: string }): Promise<{ unlinked: boolean }> {
    let unlinked = false;
    for (const root of [".claude/skills", ".agents/skills"]) {
        const at = `${ctx.fns.procs.project.workdir({})}/${root}/${opts.name}`;
        const there = await lstat(at).catch(() => null);
        if (!there?.isSymbolicLink()) continue;
        await unlink(at);
        unlinked = true;
    }
    if (unlinked) ctx.fns.procs.log.info({ event: "module.unlinked", msg: opts.name });
    return { unlinked };
}
