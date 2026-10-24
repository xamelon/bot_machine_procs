// Build the stylesheets before the port opens, so the first visitor after a
// restart gets them from memory. It is milliseconds; this only keeps a broken
// sheet in the boot log rather than in somebody's first request.
// `procs.prod` runs this before `procs/http`.
export default async function (ctx: Context, _session: Session | null) {
    const started = Date.now();
    await ctx.fns.procs.styles.rebuild({});
    ctx.fns.procs.log.info({ event: "procs.styles", msg: "styles built at boot", ms: Date.now() - started });
    return {};
}
