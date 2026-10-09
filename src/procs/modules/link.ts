// Make a mounted plugin visible to both coding-agent families. Claude reads
// project skills from `.claude/skills`; current Codex uses `.agents/skills`.
// The child entries are symlinks to the one mounted folder, but the roots are
// real directories because Codex deliberately rejects redirected skill roots.
import { resolve } from "node:path";

export default async function (ctx: Context, _session: Session | null, opts: { name: string; folder?: string }): Promise<{ linked: string | null; links: string[]; why?: string }> {
    const record = (ctx.state.procs?.modules ?? []).find((m: any) => m.name === opts.name);
    const folder = opts.folder ?? (record ? folderOf(record.dir) : "");
    if (!folder) return { linked: null, links: [], why: `no mounted module called ${opts.name}` };

    const results = await Promise.all([
        ctx.fns.procs.modules.linkSkill({ name: opts.name, folder, root: ".claude/skills" }),
        ctx.fns.procs.modules.linkSkill({ name: opts.name, folder, root: ".agents/skills" }),
    ]);
    const links = results.flatMap(result => result.linked ? [result.linked] : []);
    const why = results.find(result => result.why)?.why;
    if (links.length) ctx.fns.procs.log.info({ event: "module.linked", msg: `${opts.name} → ${folder}`, links });
    return { linked: links[0] ?? null, links, ...(why ? { why } : {}) };
}

const folderOf = (dir: string) => (dir.split("/").pop() === "src" ? resolve(dir, "..") : dir);
