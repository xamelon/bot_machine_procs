// The default home page: what this process is made of. An app replaces it by
// defining its own `src/$route__GET.ts` (the app's src is scanned last), which
// is the normal case — this exists so that a fresh proc is not a 404.
export default function (ctx: Context, _session: Session | null, _opts: {}): { title: string; main: string } {
    const modules = ctx.state.procs?.modules ?? [];
    const rows = modules.map(m => ctx.fns.procs.ui.item({
        title: m.label,
        description: `${m.namespaces.join(" · ") || m.name} · ${m.fns.length} fns · ${m.routes.length} routes${m.skill ? " · skill" : ""}`,
    })).join("");
    return {
        title: "procs",
        main: ctx.fns.procs.ui.page({
            page: "home",
            title: "procs",
            lead: `${modules.length} modules mounted`,
            main: rows || ctx.fns.procs.ui.emptyState({ title: "Nothing mounted", body: "Add a module to PROCS_PATH" }),
        }),
    };
}
