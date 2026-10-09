// This module owns the kind `phrase`: every `$phrase_<name>.json` on the
// PROCS_PATH is handed here, wherever it came from. A loader is a function like
// everything else — it takes the entries of its kind, validates them (a phrase
// without `text` is refused by name) and writes into its own module's state.
export default async function (ctx: Context, _session: Session | null, opts: { entries: any[] }): Promise<void> {
    for (const entry of opts.entries) {
        // Every function exists before any loader runs, so a loader is ordinary
        // code in a finished world: it calls through `ctx.fns` like anything else.
        ctx.fns.procs.log.debug({ msg: `phrase: ${entry.projectRel}` });
        const resource = await Bun.file(entry.abs).json();
        if (typeof resource?.text !== "string") throw new Error(`${entry.projectRel ?? entry.rel}: a phrase needs a "text"`);
        const phrases = ((ctx.state as any).greeter ??= {}).phrases ??= {};
        phrases[`${entry.module}:${entry.name}`] = {
            name: entry.name, module: entry.module,
            rel: entry.projectRel ?? entry.rel, abs: entry.abs, resource,
        };
    }
}
