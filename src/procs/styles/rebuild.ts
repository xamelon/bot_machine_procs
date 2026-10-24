// Rebuild every registered stylesheet and tell open tabs to re-fetch them.
// Called at boot and after a `$style` file changes; the `styles` event bumps the
// <link> so the new sheet lands without a page reload.
//
// Plain CSS depends on its imports and assets, not markup. Editing a route or
// function therefore does not require recompiling stylesheets.
//
// Never throws: a broken $style must not take dev.sync or the boot down with it.
// The failure is logged, and the sheet keeps serving its last good build.
export default async function (ctx: Context, _session: Session | null, _opts: {} = {}): Promise<void> {
    for (const style of ctx.state.procs?.styles ?? []) {
        try { style.css = await ctx.fns.procs.styles.build({ abs: style.abs }); }
        catch (error: any) { ctx.fns.procs.log.warn({ event: "styles.build", msg: String(error?.message ?? error) }); }
    }
    ctx.fns.procs.events.emit({ event: { type: "styles" } });
}
