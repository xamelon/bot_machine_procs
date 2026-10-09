import { expect, test } from "bun:test";
import diff from "./diff";
import snapshot from "./snapshot";

test("a named snapshot is an ephemeral baseline for diff", async () => {
    const before = { url: "/round", text: "Anna", entities: [{ entity: "patient", id: "anna", text: "Anna" }] };
    const after = { url: "/round", text: "Anna Ready", entities: [{ entity: "patient", id: "anna", text: "Anna Ready" }] };
    const ctx: any = { state: {}, fns: { screen: { read: async () => after } } };

    expect(await snapshot(ctx, null, { name: "coder-checkpoint", screen: before })).toEqual({ name: "coder-checkpoint", url: "/round" });
    const result: any = await diff(ctx, null, { from: "coder-checkpoint" });
    expect(result.updated[0].key).toBe("entity:entity=patient|id=anna");
    expect(result.updated[0].changes.text).toEqual({ before: "Anna", after: "Anna Ready" });
});

test("snapshot names and missing baselines fail clearly", async () => {
    const ctx: any = { state: {}, fns: { screen: { read: async () => ({}) } } };
    await expect(snapshot(ctx, null, { name: "not a name", screen: {} })).rejects.toThrow("screen snapshot name");
    await expect(diff(ctx, null, { from: "missing", after: {} })).rejects.toThrow("screen snapshot not found: missing");
});
