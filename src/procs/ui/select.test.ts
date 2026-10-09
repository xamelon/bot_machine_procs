// The open list escapes its box: ui.box clips its children (overflow-hidden for
// the rounded corners), and the select's absolute list was cut at the card's
// edge — one visible option, the rest under the border. Open now lifts the
// list to position:fixed at the trigger's rectangle; close puts it back.
import { test, expect } from "bun:test";
import { Window } from "happy-dom";
import { resolve } from "node:path";
import { testCtx } from "procs/test";

test("opening lifts the list to fixed, closing clears it", async () => {
    const ctx: any = await testCtx();
    const field = ctx.fns.procs.ui.select({
        name: "patient",
        options: [{ value: "p1", label: "Anna" }, { value: "p2", label: "Boris" }],
    });
    const window = new Window();
    const { document } = window;
    (globalThis as any).document = document;
    (globalThis as any).window = window;
    document.body.innerHTML = `<div class="overflow-hidden">${field}</div>`;
    await import(resolve(import.meta.dir, "$script_select.js") + `?t=${Date.now()}`);

    const root = document.querySelector("[data-field][data-select]") as any;
    const button = root.querySelector("[aria-haspopup=listbox]") as any;
    const list = root.querySelector("[role=listbox]") as any;

    button.click();
    expect(list.classList.contains("hidden")).toBe(false);
    expect(list.style.position).toBe("fixed");

    button.click();
    expect(list.classList.contains("hidden")).toBe(true);
    expect(list.style.position).toBe("");
});
