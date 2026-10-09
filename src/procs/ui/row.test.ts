// A row folds in a narrow container: with three or more cells the first takes
// the whole line (@max-md:basis-full), the rest become the meta line with the
// last on the right edge — which is what stops a portal list from squeezing a
// title into a three-line ribbon beside a date. Two cells fit a phone line and
// stay one.
import { test, expect } from "bun:test";
import { testCtx } from "procs/test";

test("three cells fold in a narrow container, two stay one line", async () => {
    const ctx: any = await testCtx();
    const three = ctx.fns.procs.ui.row({
        entity: "answer", id: "a-1",
        cells: [
            { role: "name", text: "KOOS JR — 30 days", class: "min-w-0 flex-1" },
            { role: "value", text: "knee health 82/100", class: "shrink-0 text-sm" },
            { role: "when", text: "31 Aug", class: "w-20 shrink-0 text-right text-sm" },
        ],
    });
    expect(three).toContain("@max-md:flex-wrap");
    expect(three).toContain('class="min-w-0 flex-1 @max-md:basis-full"');
    expect(three).toContain("@max-md:ml-auto");

    const two = ctx.fns.procs.ui.row({
        entity: "form", id: "f-1",
        cells: [{ role: "title", text: "PHQ-2" }, { role: "items", text: "2 questions" }],
    });
    expect(two).not.toContain("@max-md");
});

test("a link row with a control of its own on the right is not one link", async () => {
    const ctx = await testCtx();
    const row = ctx.fns.procs.ui.row({
        entity: "task", id: "t1", href: "/chart/p1",
        cells: [{ role: "who", text: "Maya Chen" }, { role: "what", text: "QOL-1" }],
        right: `<a href="/form/q1">fill in</a>`,
    });
    // The cells are the link, the control sits beside it — never an <a> in an <a>.
    expect(row).toMatch(/^<div [^>]*><a [^>]*href="\/chart\/p1"[^>]*>.*<\/a><a href="\/form\/q1">fill in<\/a><\/div>$/s);
    expect(row.slice(row.indexOf("<a") + 2, row.indexOf("</a>"))).not.toContain("<a ");
});
