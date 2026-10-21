// `$filters_<subject>.ts` declares the filter catalog for one list subject.
// Later files with the same subject name win. Duplicate ids inside a file are an error.
export default async function (ctx: Context, _session: Session | null, opts: { entries: any[] }) {
    const filters = ((ctx.state.bot ??= {}).filters ??= {});
    for (const entry of opts.entries) {
        const mod = await import(entry.abs + `?t=${Date.now()}`);
        const decl = typeof mod.default === "function" ? await mod.default(ctx, null, {}) : mod.default;
        const seen = new Set<string>();
        for (const filter of decl?.filters ?? []) {
            if (seen.has(filter.id)) throw new Error(`duplicate filter id: ${filter.id} (${entry.rel})`);
            seen.add(filter.id);
        }
        filters[entry.name] = { label: decl?.label ?? entry.name, filters: decl?.filters ?? [] };
    }
}
