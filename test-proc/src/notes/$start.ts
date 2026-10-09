// A lifecycle hook: run at boot in the order package.json proc.prod declares,
// and whatever it returns is merged into ctx.state.<module> and handed back to
// $stop. Here it just records that it ran, which the tests assert on.
export default function (ctx: Context, _config?: unknown) {
    return { startedAt: Date.now(), title: ctx.fns.procs.config.resolve({ module: "notes" }).title };
}
