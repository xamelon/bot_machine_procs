// A box makes any body sit right: rows keep their edge, a kit table loses its
// own frame (a frame in a frame is what an agent got for following the docs), a
// form, a description list, text or a project's own grid get the box's edge.
import { test, expect } from "bun:test";
import { testCtx } from "../../$test";

const ctx = await testCtx();
const box = (body: string) => ctx.fns.procs.ui.box({ title: "t", body });
const PAD = '<div class="px-4 py-3">';

test("rows are left alone; a kit table loses its frame; a form, a list, a grid and text get the edge", () => {
    expect(box(ctx.fns.procs.ui.row({ entity: "x", id: "1", cells: [{ role: "title", text: "one" }] }))).not.toContain(PAD);
    const table = box(ctx.fns.procs.ui.table({ columns: [{ key: "a", label: "A" }], rows: [{ a: 1 }], entity: "x", rowId: "a" }));
    expect(table).not.toContain(PAD);
    expect(table).not.toContain("rounded-md border");                               // one frame — the box's
    expect(table).toContain("ui-table");
    expect(box("<table><tr><td>1</td></tr></table>")).not.toContain(PAD);          // the project's own table
    expect(box(ctx.fns.procs.ui.form({ form: "f", post: "/x", body: "<input>" }))).toContain(PAD);
    expect(box(ctx.fns.procs.ui.descriptionList({ items: [{ term: "Glucose", detail: "150 mg/dL" }] }))).toContain(PAD);
    expect(box(`<div class="grid grid-cols-2 gap-4"><span>a</span></div>`)).toContain(PAD);
    expect(box("just words")).toContain(`${PAD}just words</div>`);
    expect(box(`<div class="p-6">own</div>`)).not.toContain(PAD);                   // padded itself, not twice
});
