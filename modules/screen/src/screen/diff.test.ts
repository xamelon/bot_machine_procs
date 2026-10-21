import { expect, test } from "bun:test";
import diff from "./diff";

test("diff names added, removed and updated screen rows", async () => {
    const before = {
        url: "/round",
        text: "Morning round Anna Boris",
        entities: [
            { entity: "patient", id: "anna", status: "waiting", text: "Anna 08:30", fields: { readiness: "Waiting" } },
            { entity: "patient", id: "boris", status: "waiting", text: "Boris 09:10" },
        ],
        actions: [{ action: "refresh", text: "Refresh" }],
    };
    const after = {
        url: "/round",
        text: "Morning round Anna Clara",
        entities: [
            { entity: "patient", id: "anna", status: "ready", text: "Anna Ready 08:30", fields: { readiness: "Ready" } },
            { entity: "patient", id: "clara", status: "waiting", text: "Clara 09:45" },
        ],
        actions: [{ action: "refresh", text: "Refresh" }],
    };

    const result: any = await diff({} as any, null, { before, after });
    expect(result.changed).toBe(true);
    expect(result.textChanged).toBe(true);
    expect(result.added.map((row: any) => row.key)).toEqual(["entity:entity=patient|id=clara"]);
    expect(result.removed.map((row: any) => row.key)).toEqual(["entity:entity=patient|id=boris"]);
    expect(result.updated).toEqual([{
        kind: "entity",
        key: "entity:entity=patient|id=anna",
        changes: {
            status: { before: "waiting", after: "ready" },
            text: { before: "Anna 08:30", after: "Anna Ready 08:30" },
            fields: { before: { readiness: "Waiting" }, after: { readiness: "Ready" } },
        },
    }]);
});

test("diff is quiet when the screen did not change", async () => {
    const screen = { url: "/round", text: "Same", entities: [{ entity: "patient", id: "anna", text: "Anna" }] };
    expect(await diff({} as any, null, { before: screen, after: structuredClone(screen) })).toEqual({
        changed: false,
        url: "/round",
        textChanged: false,
        added: [],
        removed: [],
        updated: [],
    });
});
