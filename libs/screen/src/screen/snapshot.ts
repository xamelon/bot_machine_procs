// Keep a readScreen answer under a short name for a later screen.diff. This is
// process memory, not product state: a runtime restart simply drops baselines.
export default async function (
    ctx: Context,
    _session: Session | null,
    opts: { name: string; screen?: any },
) {
    const name = String(opts.name ?? "").trim();
    if (!/^[a-z0-9_-]{1,40}$/i.test(name)) throw new Error("screen snapshot name must be 1-40 letters, numbers, _ or -");
    const screen = opts.screen ?? await ctx.fns.screen.read({ mode: "browser" });
    const state = (ctx.state.screen ??= { nextId: 1, pending: new Map() });
    (state.snapshots ??= {})[name] = structuredClone(screen);
    return { name, url: screen?.url ?? null };
}
