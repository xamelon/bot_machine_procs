import { test, expect } from "bun:test";
import { testCtx } from "../../$test";

test("platform pill names the messenger with its logo", async () => {
    const ctx = await testCtx();
    const tg = ctx.fns.procs.ui.platform({ platform: "telegram" });
    expect(tg).toContain(`data-platform="telegram"`);
    expect(tg).toContain(`asx-platform__logo`);
    expect(tg).toContain(">TG</span>");
    expect(ctx.fns.procs.ui.platform({ platform: "tg" })).toContain(`data-platform="telegram"`);
    expect(ctx.fns.procs.ui.platform({ platform: "VK" })).toContain(">VK</span>");
    expect(ctx.fns.procs.ui.platform({ platform: "max" })).toContain(">MAX</span>");
    const echo = ctx.fns.procs.ui.platform({ platform: "echo" });
    expect(echo).toContain(`data-platform="other"`);
    expect(echo).toContain("ph-flask");
    expect(echo).toContain(">echo</span>");
    expect(ctx.fns.procs.ui.platform({ platform: "<x>" })).not.toContain("<x>");
    const css = await Bun.file(new URL("./$style_core.css", import.meta.url)).text();
    for (const id of ["telegram", "vk", "max"]) expect(css).toContain(`.asx-platform[data-platform="${id}"]`);
});
