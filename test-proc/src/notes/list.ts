// Config is read through config.resolve, never from ctx.env directly: that is
// what makes the same code obey a default, a package.json, and an env var.
export default function (ctx: Context, _session: Session | null, _opts?: {}): types.notes.Note[] {
    const { limit } = ctx.fns.procs.config.resolve({ module: "notes" }) as ConfigOf<typeof import("./$config").default>;
    return ctx.fns.procs.db.q({ from: "notes", orderBy: "id desc", limit }) as types.notes.Note[];
}
