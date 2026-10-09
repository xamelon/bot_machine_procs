// The framework type-checks itself, in the suite. The generated `ctx_ns.d.ts` is
// what makes ctx.fns, ctx.state and Session typed at all, so a green `bun test`
// with a red `tsc` means the types are decoration — and they are not: this pass
// is what caught `config.resolve` and `modules/panel` still reading a field the
// module record no longer has.
import { test, expect } from "bun:test";
import { resolve } from "node:path";

const { testCtx } = await import("./$test");

test("the project type-checks", async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, "..") });
    await ctx.fns.procs.dev.genTypes({});                       // the d.ts the check depends on
    const { ok, errors } = await ctx.fns.procs.dev.typecheck({});
    if (!ok) console.error(errors.slice(0, 20).join("\n"));
    expect(errors).toEqual([]);
    expect(ok).toBe(true);
}, 120_000);
