// GET /math/:n — the `$id` in a file name becomes a `:param` in the path, and
// the value arrives in opts.params. Returning an object makes it JSON; there is
// no serialisation step to write.
export default function (ctx: Context, _session: Session, opts: { params: { n: string } }) {
    return ctx.fns.math.fib({ n: Number(opts.params.n) });
}
