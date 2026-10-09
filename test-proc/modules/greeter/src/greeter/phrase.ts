// Reading the module's own data files, which the scan already collected into
// its own module's state with where each came from. No path is built, so the same module
// answers correctly wherever it is mounted.
export default function (ctx: Context, _session: Session | null, opts: { name: string }): string {
    const key = `greeter:${opts.name}`;
    return (ctx.state as any).greeter?.phrases?.[key]?.resource?.text ?? "hello";
}
