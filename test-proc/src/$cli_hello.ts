// `bun script/cli.ts hello --name Ada` — a CLI command is a function like any
// other, dispatched over a registry-only boot (no server, no lifecycle).
export default function (ctx: Context, _session: Session | null, opts: any) {
    return { hello: opts.name ?? "world", fib: ctx.fns.math.fib({ n: 10 }).fib };
}
