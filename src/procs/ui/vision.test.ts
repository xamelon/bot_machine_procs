import { test, expect } from "bun:test";
import { testCtx } from "../../$test";

const ctx = await testCtx();

test("attr emits only the closed semantic vocabulary, including field", () => {
    expect(ctx.fns.procs.ui.attr({ action: "save", field: "name", typo: "lost" } as any))
        .toBe('data-action="save" data-field="name"');
});

test("menu links and posts expose stable action and id markers", () => {
    const html = ctx.fns.procs.ui.menu({ id: "people", items: [
        { label: "Anna", href: "/people/anna", action: "open-person", id: "anna", entity: "person" },
        { label: "Switch", post: "/staff/be/doc", action: "switch-staff", id: "doc", entity: "staff" },
    ] });
    expect(html).toContain('data-action="open-person" data-entity="person" data-id="anna"');
    expect(html).toContain('data-action="switch-staff" data-entity="staff" data-id="doc"');
});

test("URL choice and breadcrumb helpers expose semantic choices", () => {
    const segmented = ctx.fns.procs.ui.segmented({ value: "lab", items: [
        { label: "Medication", value: "medication", href: "/orders?kind=medication" },
        { label: "Lab", value: "lab", href: "/orders?kind=lab" },
    ] });
    expect(segmented).toContain('data-action="select" data-role="segment" data-id="lab" data-status="active"');
    const crumbs = ctx.fns.procs.ui.breadcrumb({ items: [{ label: "Patients", href: "/ehr" }, { label: "Anna" }] });
    expect(crumbs).toContain('data-action="open-crumb" data-id="patients"');
});

test("forms may carry the entity and state their action belongs to", () => {
    expect(ctx.fns.procs.ui.form({ form: "appointment-action", entity: "appointment", id: "a1", status: "booked", body: "" }))
        .toContain('data-form="appointment-action" data-entity="appointment" data-id="a1" data-status="booked"');
});
