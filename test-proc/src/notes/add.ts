// The db connection lives on ctx.state, so a forked environment gets its own and
// a test never touches the development database.
export default function (ctx: Context, _session: Session | null, opts: { text: string }): types.notes.Note {
    const at = new Date().toISOString();
    const { lastInsertRowid } = ctx.fns.procs.db.insert({ into: "notes", values: { text: opts.text, at } });
    return { id: lastInsertRowid, text: opts.text, at };
}
