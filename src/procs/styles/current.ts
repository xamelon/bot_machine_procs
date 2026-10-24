// The CSS to serve for `key`: the sheet's last build, or a build now if it has
// none yet — `http.loadRoutes` replaces the style records on every reload, and a
// new `$style` file has never been built. Building is milliseconds, so the first
// request after a reload simply pays for it.
export default async function (ctx: Context, _session: Session | null, opts: { key: string }): Promise<string> {
    const style = (ctx.state.procs?.styles ?? []).find(s => s.key === opts.key);
    if (!style) throw new Error(`no stylesheet ${opts.key}`);
    style.css ??= await ctx.fns.procs.styles.build({ abs: style.abs });
    return style.css;
}
