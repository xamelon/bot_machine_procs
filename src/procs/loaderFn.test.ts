import { test, expect } from "bun:test";
import { makeCtx } from "../$main";
import load from "./$loader_fn";

test("fn loader does not invoke a registered function before its dependency exists", async () => {
    const ctx = makeCtx();
    const entries = [
        { runtimeName: "debug", fn: (ctx: any) => ctx.fns.procs.log.emit({}) },
        { runtimeName: "emit", fn: () => true },
    ].map(e => ({ ...e, moduleDir: "procs/log", rel: `procs/log/${e.runtimeName}.ts`, abs: `${import.meta.dir}/log/${e.runtimeName}.ts`, root: "core", source: "// test" }));
    await load(ctx, null, { entries });
    expect(ctx.fns.procs.log.debug({ event: "test" })).toBe(true);
});
