// Bundle one `$style_<name>.css` and return the CSS text. Plain CSS in, plain
// CSS out: Bun's own bundler, in this process — `@import`s inlined, nesting
// flattened, minified. A few milliseconds, no child process, no scan of the
// markup: a sheet depends on CSS imports and assets, not class-name scanning.
//
// `url(/…)` stays as written: those are our routes (the Golos font, icons),
// served at that path, not files for the bundler to find. Relative `@import`s
// and `url()`s are still resolved and inlined.
export default async function (ctx: Context, _session: Session | null, opts: { abs: string }): Promise<string> {
    const result = await Bun.build({ entrypoints: [opts.abs], minify: true, external: ["/*"], throw: false });
    const logs = result.logs.map(log => `${log.level}: ${log.message}${log.position ? ` (line ${log.position.line})` : ""}`);
    if (!result.success || !result.outputs[0]) throw new Error(`stylesheet ${opts.abs} did not build:\n${logs.join("\n")}`);
    // An at-rule the bundler does not know is a
    // warning, and the rule is passed through for the browser to ignore — worth
    // saying, since it means something in the file does nothing.
    for (const line of logs) ctx.fns.procs.log.warn({ event: "styles.build", msg: `${opts.abs}: ${line}` });
    return await result.outputs[0].text();
}
