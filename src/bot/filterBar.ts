// Reads `?filters=<tree>` for a `$filters_<subject>` catalog and draws the PowerSearch bar.
export default function (ctx: Context, session: Session | null, opts: { subject: string; href: string }) {
    const url = session?.req ? new URL(session.req.url) : null;
    const raw = url?.searchParams.get("filters") ?? null;
    const q = url?.searchParams.get("q") ?? "";
    let tree: any = { all: [] };
    let error = "";
    if (raw) {
        try { tree = JSON.parse(raw); }
        catch { error = "invalid JSON"; }
    }
    const applied = error ? { ok: false, error, where: "1=0", params: [] } : ctx.fns.bot.filterApply({ subject: opts.subject, tree, q });
    const filters = Array.isArray(tree?.all) ? tree.all.filter((item: any) => item?.filter).map((item: any) => ({ field: item.filter, operator: item.op, value: item.value })) : [];
    const bar = ctx.fns.bot.form({
        form: `${opts.subject}-filters`,
        get: opts.href,
        push: true,
        class: "asx-inline-form",
        body: ctx.fns.procs.ui.powerSearch({ name: "filters", subject: opts.subject, filters, query: q }) + ctx.fns.procs.ui.button({ label: "Apply", variant: "primary", type: "submit" }),
    });
    return { applied, bar, error: applied.ok ? "" : applied.error };
}
