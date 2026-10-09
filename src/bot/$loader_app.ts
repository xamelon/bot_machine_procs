// `$app_<name>.json` is a menu card, not a route. Later files with the same name win.
export default async function (ctx: Context, _session: Session | null, opts: { entries: any[] }) {
    const apps = ((ctx.state.bot ??= {}).apps ??= {});
    for (const entry of opts.entries) {
        apps[entry.name] = { ...(await Bun.file(entry.abs).json()), name: entry.name };
    }
}
