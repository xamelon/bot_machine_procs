import { test, expect } from "bun:test";
import read from "./read";
import readScreen from "./readScreen";
import open from "./open";

test("browser mode, compatibility alias and open share one snapshot contract", async () => {
    const snapshot = { source: "browser", url: "/ehr", page: "patients", markers: [] };
    const ctx: any = {
        fns: { screen: {}, procs: {} },
    };
    ctx.fns.screen.eval = async ({ code }: any) => code.includes("window.page.go") ? { opened: "/ehr", steps: [] } : snapshot;
    ctx.fns.screen.read = (opts: any) => read(ctx, null, opts);
    ctx.fns.screen.readScreen = (opts: any) => readScreen(ctx, null, opts);

    expect(await read(ctx, null, { mode: "browser" })).toEqual(snapshot);
    expect(await readScreen(ctx, null, {})).toEqual(snapshot);
    expect(await open(ctx, null, { url: "/ehr", settleMs: 0 })).toEqual({ ...snapshot, steps: [] });
    expect(await open(ctx, null, { url: "/ehr", settleMs: 0, read: false })).toEqual({ opened: "/ehr", steps: [] });
});

test("browser wait has a bounded client timeout and outer watchdog", async () => {
    const calls: any[] = [];
    const ctx: any = { fns: { screen: { eval: async (opts: any) => { calls.push(opts); return {}; } } } };
    await read(ctx, null, { mode: "browser", waitFor: { action: "save" }, timeoutMs: 999_999 });
    expect(calls[0].timeoutMs).toBe(31_000);
    expect(calls[0].code).toContain('30000');
    await read(ctx, null, { mode: "browser", waitFor: { action: "save" }, timeoutMs: 0 });
    expect(calls[1].timeoutMs).toBe(1_001);
    expect(calls[1].code).toContain(', 1)');
});

test("read mode is explicit and browser reads never navigate", async () => {
    const ctx: any = { fns: { screen: { eval: async () => ({ source: "browser" }) } } };
    expect(await read(ctx, null, {})).toEqual({ source: "browser" });
    expect(read(ctx, null, { mode: "browser", url: "/ehr" })).rejects.toThrow("call screen.open");
    expect(read(ctx, null, { mode: "server" })).rejects.toThrow("needs url");
});
