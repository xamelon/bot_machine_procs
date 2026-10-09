// Calling a neighbour: through ctx.fns, never by import. That is what lets
// either function be hot-swapped, mounted elsewhere, or moved behind a worker.
export default function (ctx: Context, _session: Session | null, opts: { upto: number }): number {
    let total = 0;
    for (let i = 1; i <= opts.upto; i++) total += ctx.fns.math.fib({ n: i }).fib;
    return total;
}
