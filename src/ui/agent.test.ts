import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { Window } from "happy-dom";
import { testCtx } from "../$test";

test("chat shows errors during work, streams partials and returns to idle after failure", async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, "../..") });
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    let state: any = { configured: true, entries: [{ model: [
        { role: "assistant", content: [], stopReason: "error", errorMessage: "Rate limit <img src=x>" },
        { role: "tool", content: "File not found", isError: true },
    ] }], docs: { "pi.live": {
        run: { taskId: "1", inputs: [] },
        generation: { message: { role: "assistant", content: [{ type: "text", text: "Checking files" }] }, retry: { error: "Provider unavailable" } },
        tools: [{ name: "read", status: "running", output: "Reading src", diagnostics: [{ severity: "error", message: "Permission denied" }] }],
        compactions: [{ retry: { error: "Summary timeout" } }],
    } } };
    let refresh: (() => Promise<void>) | undefined;
    const fetch = async (url: string) => new window.Response(JSON.stringify(String(url).endsWith('/state') ? state : {}));
    const run = new Function("document", "fetch", "crypto", "Event", "setTimeout", await Bun.file(resolve(import.meta.dir, "$script_agent.js")).text());
    try {
        window.document.write(ctx.fns.ui.layout({ main: "Page" }));
        run(window.document, fetch, window.crypto, window.Event, (fn: () => Promise<void>) => { refresh = fn; });
        await Bun.sleep(20);
        const document = window.document;
        const messages = () => document.querySelector('[data-agent-messages]')!.textContent;
        expect(document.querySelector('[data-agent-status]')!.textContent).toBe("Working…");
        expect(messages()).toContain("Checking files");
        expect(messages()).toContain("Pi is working…");
        expect(messages()).toContain("read: running\nReading src");
        for (const error of ["Rate limit <img src=x>", "File not found", "Provider unavailable", "Permission denied", "Summary timeout"]) expect(messages()).toContain(error);
        expect(document.querySelectorAll('[data-agent-messages] [role=alert]').length).toBe(5);
        expect(document.querySelector('[data-agent-messages] img')).toBeNull();
        state.docs['pi.live'] = { compactionFailure: { error: "Summary failed permanently" } };
        await refresh!();
        expect(document.querySelector('[data-agent-status]')!.textContent).toBe("Ready");
        expect(messages()).toContain("Summary failed permanently");
        expect(messages()).not.toContain("Pi is working…");
        expect(messages()).not.toContain("Checking files");
        expect(messages()).toContain("Rate limit");
    } finally { await window.happyDOM.close(); }
});

test("chat preserves HTTP error details from non-JSON responses", async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, "../..") });
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    const fetch = async () => new window.Response("Agent unavailable", { status: 502 });
    try {
        window.document.write(ctx.fns.ui.layout({ main: "Page" }));
        const run = new Function("document", "fetch", "crypto", "Event", "setTimeout", await Bun.file(resolve(import.meta.dir, "$script_agent.js")).text());
        run(window.document, fetch, window.crypto, window.Event, () => {});
        await Bun.sleep(20);
        expect(window.document.querySelector('[data-agent-status]')!.textContent).toBe("Disconnected");
        const error = window.document.querySelector<HTMLElement>('[data-agent-error]')!;
        expect(error.hidden).toBe(false);
        expect(error.textContent).toBe("HTTP 502: Agent unavailable");
    } finally { await window.happyDOM.close(); }
});
