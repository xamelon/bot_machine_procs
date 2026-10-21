// Compile the stylesheets before the port opens, not on the first visitor.
//
// Tailwind compiles each `$style_*.css` once per process (~150 ms each, and they
// arrive together, so whoever loads the first page after a restart waits ~400 ms
// for their own page's CSS). It is a build, not a request: paying it at boot
// costs the deploy half a second and costs nobody their first paint.
// `procs.prod` runs this before `procs/http`, so the window never opens early.
export default async function (ctx: Context, _session: Session | null) {
    const started = Date.now();
    await ctx.fns.procs.styles.rebuild({});
    ctx.fns.procs.log.info({ event: "procs.styles", msg: "styles compiled at boot", ms: Date.now() - started });
    return {};
}
