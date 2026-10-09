import { test, expect } from "bun:test";
import { testCtx } from "../../$test";

test("a toast is marked like a notice and lifts itself into the stack on load", async () => {
    const ctx: any = await testCtx();
    const html = ctx.fns.procs.ui.toast({ text: "Back to real time.", tone: "success" });
    expect(html).toContain('data-role="toast"');
    expect(html).toContain('data-tone="success"');
    expect(html).toContain('hx-on:hyper-load="window.toast.show(this, 3000)"');
    expect(html).toContain('data-action="dismiss"');
});
