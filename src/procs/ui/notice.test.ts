// UNIT test: a notice is seen, and a page has a rhythm.
//
// Both from looking at real screens: an amber `alert-soft` band on the near-white
// paper the workspace draws pages on was a rectangle you had to be told was
// there — the one element whose whole job is to be noticed. And `ui.page`
// dropped `main` in raw, so every block touched the one above it: the banner
// against the sentence, the tiles against the banner, the filter row welded to
// its table.
import { test, expect } from "bun:test";
import { testCtx } from "../../$test";

const ctx = await testCtx();

test("every tone carries a border, and the sentence stays legible", () => {
    for (const tone of ["info", "success", "warning", "danger"] as const) {
        const html = ctx.fns.procs.ui.notice({ text: "the record could not be read", tone });
        expect(html).toContain("rounded-lg border ");
        expect(html).toContain(`border-${tone === "danger" ? "error" : tone}/`);
        // The tint is a tenth-strength wash, so the words are read in the page's
        // own ink — daisyUI's `*-content` is for text on a SOLID fill.
        expect(html).toContain("text-base-content");
        expect(html).not.toContain(`text-${tone === "danger" ? "error" : tone}-content`);
        expect(html).toContain(`data-tone="${tone}"`);
        expect(html).toContain(`data-role="notice"`);
    }
});

test("the page shell spaces the blocks it is given", () => {
    const html = ctx.fns.procs.ui.page({ page: "demo", title: "Register", lead: "everybody with a diagnosis", main: "<p>one</p><p>two</p>" });
    expect(html).toContain(`<div class="mt-5 space-y-4"><p>one</p><p>two</p></div>`);
});
