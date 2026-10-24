// GET /procs/modules/skill?name=<module> — the module's SKILL.md, read.
//
// A `SKILL.md` is written for the agent, and until now that is the only thing
// that ever opened one: the panel said a module *has* a skill and gave no way to
// see it, so the person deciding whether to turn a module on knew less about it
// than the agent did. It is the same page for both.
//
// Rendering is borrowed rather than reimplemented: the framework ships no
// markdown renderer — that would be a second set of rules beside the one the
// host already uses for READMEs and for the chat — so it asks the
// `procs.ui.markdown` point, and shows the file as text where nobody answers.
export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const ui = ctx.fns.procs.ui;
    const name = new URL(opts.req.url).searchParams.get("name") ?? "";
    const module = (ctx.state.procs.modules ?? []).find((m: any) => m.name === name || m.namespaces?.includes(name));

    if (!module?.skill) {
        return {
            title: "skill",
            status: 404,
            main: ctx.fns.procs.ui.banner({ tone: "warning", body: `${name || "that module"} ships no SKILL.md` }),
        };
    }

    const text = await Bun.file(module.skill).text().catch(() => null);
    if (text === null) {
        return { title: "skill", status: 404, main: ctx.fns.procs.ui.banner({ tone: "error", body: `${module.skill} is named by the module and is not on disk` }) };
    }

    const body = await ctx.fns.procs.hooks.first({ name: "procs.ui.markdown", opts: { text } })
        ?? ui.code({ code: text, block: true, wrap: true });

    return {
        title: `${module.name} · skill`,
        main: ctx.fns.procs.ui.page({
            page: "skill",
            title: module.label ?? module.name,
            lead: `${ui.code({ code: module.skill })} — what the agent reads before it touches this module.`,
            main: ui.card({ title: "SKILL.md", body }),
        }),
    };
}
