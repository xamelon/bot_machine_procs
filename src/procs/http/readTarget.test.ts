// UNIT test: src/http/readTarget.test.ts ↔ src/http/readTarget.ts (one function).
//
// What this pins is the accident it came from: htmx 4 changed `HX-Target` from
// the bare id to `tag#id`, so every `=== "mgr-nav"` in the tree kept compiling
// and stopped being true — pinning a project answered the rail with the whole
// grid and drew it in a 15rem column.
import { test, expect } from "bun:test";
import { testCtx } from "../../$test";

const ctx = await testCtx();
const asked = (target?: string) => ctx.fns.procs.http.readTarget({
    req: new Request("http://x/", { headers: target ? { "hx-target": target } : {} }),
});

test("readTarget: htmx 4 sends tag#id", () => {
    expect(asked("nav#mgr-nav")).toBe("mgr-nav");
    expect(asked("div#main")).toBe("main");
});

test("readTarget: nothing aimed at — a navigation, or a target with no id", () => {
    expect(asked()).toBe("");
    expect(asked("div")).toBe("");
});

test("readTarget: an id htmx had to encode comes back as it was written", () => {
    expect(asked(`div#${encodeURI("row for a444")}`)).toBe("row for a444");
});
