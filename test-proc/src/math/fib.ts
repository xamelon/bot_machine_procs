// An ordinary function: one file, one default export, the same signature as
// every other. Called as `ctx.fns.math.fib({ n })` — ctx and session are
// injected, so a caller passes only its own arguments.
export default function (_ctx: Context, _session: Session | null, opts: { n: number }): { n: number; fib: number } {
    let [a, b] = [0, 1];
    for (let i = 0; i < opts.n; i++) [a, b] = [b, a + b];
    return { n: opts.n, fib: a };
}
