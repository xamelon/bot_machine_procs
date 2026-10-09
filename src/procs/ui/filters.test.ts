// UNIT test: the one control every list narrows itself with. What is pinned here
// is the RULE — few choices are chips, many are a menu, the chosen one is
// inverted — because that rule is the whole reason this is a kit component and
// not three hand-rolled rows.
import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { testCtx } from "procs/test";

const ctx = await testCtx({ root: resolve(import.meta.dir, "..", "..", "..") });

const at = (name: string, value: string) => `/things?${name}=${value}`;

test("few choices are chips, all of them on the row", () => {
    const html = ctx.fns.procs.ui.filters({
        groups: [{
            label: "when", value: "today",
            items: [
                { label: "today", value: "today", href: at("when", "today") },
                { label: "this week", value: "week", href: at("when", "week") },
                { label: "all", value: "all", href: at("when", "all") },
            ],
        }],
    });
    expect(html).toContain(`data-role="filters"`);
    expect(html).toContain(`data-field="when"`);
    expect(html).toContain(`data-action="filter" data-id="today"`);
    expect(html).toContain(`data-action="filter" data-id="week"`);
    expect(html).toContain(`data-action="filter" data-id="all"`);
    // No menu was built for three of them.
    expect(html).not.toContain(`data-entity="menu"`);
});

test("many choices are a menu, showing the one that is chosen", () => {
    const html = ctx.fns.procs.ui.filters({
        groups: [{
            label: "type", value: "follow-up", empty: "any",
            items: [
                { label: "any type", value: "", href: at("type", "") },
                { label: "follow-up", value: "follow-up", href: at("type", "follow-up"), count: 7 },
                { label: "check-up", value: "check-up", href: at("type", "check-up"), count: 3 },
                { label: "first visit", value: "first", href: at("type", "first"), count: 2 },
            ],
        }],
    });
    expect(html).toContain(`data-entity="menu" data-id="filter-type"`);
    expect(html).toContain(`data-role="filter" data-id="type"`);
    // The button says what is chosen, and the count rides along in the list.
    expect(html).toContain(">follow-up<");
    expect(html).toContain("follow-up · 7");
    // Every menu choice carries the same stable action/id vocabulary as chips.
    expect(html).toContain(`data-action="filter" data-id="follow-up" data-status="active"`);
});

// Nothing chosen says so in the caller's own word, not by going blank: the item
// whose value is empty IS "no narrowing", and its label is what the button wears
// until something is picked.
test("an unchosen menu wears the empty item's label", () => {
    const html = ctx.fns.procs.ui.filters({
        groups: [{
            label: "status", empty: "any", items: [
                { label: "any status", value: "", href: at("status", "") },
                { label: "finished", value: "finished", href: at("status", "finished") },
                { label: "in-progress", value: "in-progress", href: at("status", "in-progress") },
                { label: "cancelled", value: "cancelled", href: at("status", "cancelled") },
            ],
        }],
    });
    expect(html).toContain(">any status<");
});

// A narrowing can always be undone where it was made: the chip that is lit
// links back to the group's empty choice, not to itself — so pressing the
// filter you are on turns it off instead of doing nothing.
test("a lit chip is a toggle back to the empty choice", () => {
    const html = ctx.fns.procs.ui.filters({
        groups: [{
            label: "show", value: "flagged",
            items: [
                { label: "everybody", value: "", href: at("show", "") },
                { label: "flagged", value: "flagged", href: at("show", "flagged"), count: 3 },
                { label: "waiting", value: "waiting", href: at("show", "waiting") },
            ],
        }],
    });
    // The lit chip's address is the empty item's, and the rest still lead to themselves.
    expect(html).toContain(`href="${at("show", "")}" hx-get="${at("show", "")}" hx-target="#main" hx-swap="innerHTML" hx-push-url="true"
  data-action="filter" data-id="flagged" data-status="active"`);
    expect(html).toContain(`href="${at("show", "waiting")}"`);
});

// A group with one thing in it is not a choice, and drawing it is a control that
// cannot do anything — a clinic with one kind of visit gets a "type" filter that
// only ever says the same word.
test("a group with nothing to choose between is not drawn", () => {
    const html = ctx.fns.procs.ui.filters({
        groups: [
            { label: "type", items: [{ label: "only one", value: "one", href: at("type", "one") }] },
            { label: "when", items: [
                { label: "today", value: "today", href: at("when", "today") },
                { label: "all", value: "all", href: at("when", "all") },
            ] },
        ],
    });
    expect(html).not.toContain(`data-field="type"`);
    expect(html).toContain(`data-field="when"`);
});
