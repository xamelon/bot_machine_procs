import { test, expect } from "bun:test";
import { testCtx } from "../../../../workspace/src/$test";

const ctx = await testCtx();

test("server parser extracts nested markers, links, state and text", async () => {
    const html = `<html><body><main id="main" data-page="patients"><h1>Patients</h1><div data-section="list"><article data-entity="patient" data-id="anna" data-status="active"> Anna <a href="/ehr/patient/anna"><span>Open chart</span></a><button data-action="review" disabled>Review</button></article><form data-form="search"><input data-field="q" value="ann" checked></form></div></main></body></html>`;
    const out = await ctx.fns.screen.parse({ html, scope: "main" });
    expect(out.headings).toEqual([{ level: 1, text: "Patients" }]);
    expect(out.links).toContainEqual({ href: "/ehr/patient/anna", text: "Open chart" });
    const patient = out.markers.find((m: any) => m.entity === "patient")!;
    expect(patient).toMatchObject({ id: "anna", status: "active", href: "/ehr/patient/anna" });
    expect(patient.text).toContain("Anna Open chart Review");
    expect(patient.links).toEqual([{ href: "/ehr/patient/anna", text: "Open chart" }]);
    expect(out.markers.find((m: any) => m.action === "review")).toMatchObject({ disabled: true, entity: "patient", id: "anna" });
    expect(out.markers.find((m: any) => m.field === "q")).toMatchObject({ value: "ann", checked: true });
    expect(out.text).toContain("Patients Anna Open chart Review");
});

test("main scope excludes host chrome from server vision", async () => {
    const html = `<body><aside><button data-action="chrome">Chrome</button></aside><main id="main" data-page="inside"><h1>Inside</h1><button data-action="save">Save</button></main></body>`;
    const main = await ctx.fns.screen.parse({ html, scope: "main" });
    expect(main.markers.map((m: any) => m.action).filter(Boolean)).toEqual(["save"]);
    expect(main.text).toBe("Inside Save");
    const body = await ctx.fns.screen.parse({ html, scope: "body" });
    expect(body.markers.map((m: any) => m.action).filter(Boolean)).toEqual(["chrome", "save"]);
});

test("adjacent elements get readable separators without changing inline phrases", async () => {
    const out = await ctx.fns.screen.parse({ html: `<main id="main"><span>Maya Thompson</span><span>1962-04-17</span><p>MRN <b>RT-1001</b></p><button>Save</button></main>`, scope: "main" });
    expect(out.text).toBe("Maya Thompson 1962-04-17 MRN RT-1001 Save");
});

test("action context follows only its parent chain, never a previous sibling", async () => {
    const html = `<main id="main" data-page="form"><form data-form="order"><div data-field="priority"><button data-action="open-select">Priority</button></div><a data-action="cancel" href="/orders">Cancel</a></form></main>`;
    const out = await ctx.fns.screen.parse({ html, scope: "main" });
    expect(out.markers.find((m: any) => m.action === "open-select")).toMatchObject({ form: "order", field: "priority" });
    expect(out.markers.find((m: any) => m.action === "cancel")).toMatchObject({ form: "order" });
    expect(out.markers.find((m: any) => m.action === "cancel")?.field).toBeUndefined();
});

test("parser corner cases keep stacks, links, suppression and recovery isolated", async () => {
    const html = `<!doctype html><body>
      <aside><button data-action="chrome">Chrome</button></aside>
      <main id="main" data-page="cases">
        <article data-entity="patient" data-id="maya"><a href="/maya">Maya <span data-role="dob">1962</span></a><a href="/maya/tasks">Tasks</a></article>
        <form data-form="order"><label data-field="priority">Priority <button data-action="open-select">Open</button></label><input data-field="q" value="x" checked><br><a data-action="cancel" href="/orders">Cancel</a></form>
        <script><button data-action="fake">Fake</button></script><style>.x{content:"Fake"}</style>
        <section data-section="broken"><b>unclosed
      </main>
      <footer><a data-action="outside" href="/outside">Outside</a></footer>`;
    const out = await ctx.fns.screen.parse({ html, scope: "main" });
    expect(out.markers.some((m: any) => m.action === "chrome" || m.action === "outside" || m.action === "fake")).toBe(false);
    expect(out.links).toEqual([{ href: "/maya", text: "Maya 1962" }, { href: "/maya/tasks", text: "Tasks" }, { href: "/orders", text: "Cancel" }]);
    expect(out.markers.find((m: any) => m.entity === "patient")?.links).toEqual([{ href: "/maya", text: "Maya 1962" }, { href: "/maya/tasks", text: "Tasks" }]);
    expect(out.markers.find((m: any) => m.action === "open-select")).toMatchObject({ form: "order", field: "priority" });
    expect(out.markers.find((m: any) => m.action === "cancel")).toMatchObject({ form: "order", href: "/orders" });
    expect(out.markers.find((m: any) => m.action === "cancel")?.field).toBeUndefined();
    expect(out.markers.find((m: any) => m.field === "q")).toMatchObject({ value: "x", checked: true });
    expect(out.text).not.toContain("Fake");
    expect(out.diagnostics).toEqual([]);
});

test("parser diagnostics distinguish missing markers and duplicate descriptors", async () => {
    const html = `<main id="main"><button>Loose</button><button data-action="save" data-id="same">One</button><button data-action="save" data-id="same">Two</button></main>`;
    const out = await ctx.fns.screen.parse({ html, scope: "main" });
    expect(out.diagnostics).toContainEqual({ code: "interactive-without-marker", tag: "button", text: "Loose", href: undefined });
    expect(out.diagnostics).toContainEqual({ code: "missing-page-marker" });
    expect(out.diagnostics).toContainEqual({ code: "duplicate-descriptor", detail: "action:save:same: (2)" });
});

test("tables expose columns, row identity and role-keyed cells", async () => {
    const html = `<main id="main"><table><thead><tr><th>Patient</th><th>Status</th></tr></thead><tbody><tr data-entity="task" data-id="t1" data-status="open"><td data-role="patient">Maya</td><td data-role="status">Overdue</td></tr></tbody></table></main>`;
    const out = await ctx.fns.screen.parse({ html, scope: "main" });
    expect(out.tables).toEqual([{ columns: ["Patient", "Status"], rows: [{ entity: "task", id: "t1", status: "open", cells: { patient: "Maya", status: "Overdue" }, text: "Maya Overdue" }] }]);
});

test("semantic diagnostics flag unmarked controls and missing page roots", async () => {
    const out = await ctx.fns.screen.parse({ html: `<main id="main"><button>Save</button><a href="/ok" data-action="open">Open</a></main>`, scope: "main" });
    expect(out.diagnostics).toContainEqual({ code: "interactive-without-marker", tag: "button", text: "Save", href: undefined });
    expect(out.diagnostics).toContainEqual({ code: "missing-page-marker" });
});

test("screen.read server mode parses a rendered route without a browser", async () => {
    const out: any = await ctx.fns.screen.read({ mode: "server", url: "/ehr", maxText: 300 });
    expect(out.source).toBe("server");
    expect(out.status).toBe(200);
    expect(out.page).toBe("patients");
    expect(out.durationMs).toBeGreaterThanOrEqual(0);
    expect(out.actions.some((a: any) => a.action === "search")).toBe(true);
});

test("screen.read reports missing routes", async () => {
    const out: any = await ctx.fns.screen.read({ mode: "server", url: "/definitely-missing" });
    expect(out.status).toBe(404);
});
