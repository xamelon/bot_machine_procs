import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { Window } from "happy-dom";

// Browser client has no Markdown dependency: it uses procs.ui.markdown.
const agentScript = await Bun.file(resolve(import.meta.dir, "$script_agent.js")).text();
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
    const run = new Function("document", "fetch", "crypto", "Event", "setTimeout", agentScript);
    try {
        window.document.write(ctx.fns.ui.layout({ main: "Page" }));
        run(window.document, fetch, window.crypto, window.Event, (fn: () => Promise<void>) => { refresh = fn; });
        await Bun.sleep(20);
        const document = window.document;
        const messages = () => document.querySelector('[data-agent-messages]')!.textContent;
        expect(document.querySelector('[data-agent-status]')!.textContent, document.querySelector('[data-agent-error]')!.textContent ?? '').toBe("Working…");
        // Stop is for a run that exists: visible while `pi.live.run` is set.
        expect(document.querySelector<HTMLElement>('[data-agent-stop]')!.hidden).toBe(false);
        expect(messages()).toContain("Checking files");
        expect(messages()).toContain("Pi is working…");
        const tool = document.querySelector('[data-agent-messages] .asx-chat-tool-call[data-status=error] [data-tool-name]')!;
        expect(document.querySelector('[data-agent-messages] [data-tool-result]')!.textContent).toContain('File not found');
        expect(messages()).toContain('Reading src');
        expect(tool).not.toBeNull();
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
        const run = new Function("document", "fetch", "crypto", "Event", "setTimeout", agentScript);
        run(window.document, fetch, window.crypto, window.Event, () => {});
        await Bun.sleep(20);
        expect(window.document.querySelector('[data-agent-status]')!.textContent).toBe("Disconnected");
        // Nothing to stop when the agent cannot even be reached.
        expect(window.document.querySelector<HTMLElement>('[data-agent-stop]')!.hidden).toBe(true);
        const error = window.document.querySelector<HTMLElement>('[data-agent-error]')!;
        expect(error.hidden).toBe(false);
        expect(error.textContent).toBe("HTTP 502: Agent unavailable");
    } finally { await window.happyDOM.close(); }
});

test("tool calls are paired with results, compact, safe and stay expanded during polling", async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, "../..") });
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    const state: any = { configured: true, entries: [{ model: [
        { role: "assistant", content: [{ type: "text", text: "Checking" }, { type: "toolCall", id: "read-1", name: "read", arguments: { path: "src/app/page.ts", query: "<img src=x onerror=alert(1)>" } }] },
        { role: "toolResult", toolCallId: "read-1", toolName: "read", content: [{ type: "text", text: "File contents <script>bad()</script>" }], durationMs: 125, isError: false },
        { role: "assistant", content: [{ type: "toolCall", id: "edit-1", name: "edit", arguments: { path: "src/app/page.ts" } }] },
    ] }], docs: { "pi.live": { run: { taskId: "run" }, tools: [{ callId: "read-1", name: "read", status: "done" }, { callId: "edit-1", name: "edit", status: "running", output: "Applying changes" }] } } };
    let refresh: (() => Promise<void>) | undefined;
    const fetch = async () => new window.Response(JSON.stringify(state));
    const run = new Function("document", "fetch", "crypto", "Event", "setTimeout", agentScript);
    try {
        window.document.write(ctx.fns.ui.layout({ main: "Page" }));
        run(window.document, fetch, window.crypto, window.Event, (fn: () => Promise<void>) => { refresh = fn; });
        await Bun.sleep(20);
        const document = window.document;
        const list = document.querySelector('[data-agent-messages]')!;
        expect(list.querySelectorAll('.asx-chat-tool-call').length, document.querySelector('[data-agent-error]')!.textContent ?? '').toBe(2);
        expect(list.querySelectorAll('.asx-chat-tool-calls').length).toBe(1);
        const batch = list.querySelector<HTMLDetailsElement>('[data-tool-batch]')!;
        expect(batch.open).toBe(false);
        expect(batch.querySelector('summary')!.textContent).toContain('2 tools called');
        expect(batch.querySelector('summary')!.textContent).not.toContain('read');
        expect(list.querySelector('[data-tool-status]')!.classList.contains('asx-visually-hidden')).toBe(true);
        const read = list.querySelector<HTMLDetailsElement>('[data-tool-key="read-1"]')!;
        expect(read.open).toBe(false);
        expect(read.dataset.status).toBe('complete');
        expect(read.querySelector('summary')!.textContent).toContain('read');
        expect(read.querySelector('summary')!.textContent).not.toContain('File contents');
        expect(read.querySelector('[data-tool-duration]')!.textContent).toBe('125 ms');
        expect(read.querySelector('[data-tool-arguments] pre')!.textContent).toContain('<img');
        expect(read.querySelector('[data-tool-result] pre')!.textContent).toContain('<script>');
        expect(list.querySelectorAll('img,script').length).toBe(0);
        batch.open = true;
        read.open = true;
        read.querySelector('summary')!.focus();
        state.docs['pi.live'].tools[1].output = 'Almost finished';
        await refresh!();
        expect(list.querySelector<HTMLDetailsElement>('[data-tool-key="read-1"]')!.open).toBe(true);
        expect(document.activeElement?.closest('[data-tool-key]')?.getAttribute('data-tool-key')).toBe('read-1');
        expect(list.querySelector('[data-tool-key="edit-1"]')!.getAttribute('data-status')).toBe('running');
        expect(list.querySelector<HTMLDetailsElement>('[data-tool-batch]')!.open).toBe(true);
        state.entries[0].model.push({ role: "toolResult", toolCallId: "edit-1", toolName: "edit", content: [{ type: "text", text: "Permission denied" }], isError: true });
        state.docs['pi.live'] = {};
        await refresh!();
        expect(list.querySelectorAll('.asx-chat-tool-call').length).toBe(2);
        expect(list.querySelector('[data-tool-key="edit-1"]')!.getAttribute('data-status')).toBe('error');
        expect(list.querySelector('[data-tool-key="edit-1"] [role=alert]')!.textContent).toContain('Permission denied');
        expect(list.querySelector<HTMLDetailsElement>('[data-tool-key="read-1"]')!.open).toBe(true);
        state.entries[0].model.push({ role: 'assistant', content: [{ type: 'toolCall', id: 'check-1', name: 'check', arguments: {} }] });
        await refresh!();
        expect(list.querySelectorAll('[data-tool-batch]').length).toBe(1);
        expect(list.querySelector('[data-tool-batch-label]')!.textContent).toBe('3 tools called');
        expect(list.querySelector<HTMLDetailsElement>('[data-tool-batch]')!.open).toBe(true);
        list.querySelector<HTMLDetailsElement>('[data-tool-batch]')!.open = false;
        state.entries[0].model.push({ role: 'toolResult', toolCallId: 'check-1', toolName: 'check', content: 'Checked', isError: false });
        await refresh!();
        expect(list.querySelector<HTMLDetailsElement>('[data-tool-batch]')!.open).toBe(false);
        state.entries[0].model.push({ role: 'assistant', content: [{ type: 'text', text: 'Next step' }, { type: 'toolCall', id: 'next-1', name: 'read', arguments: {} }] });
        await refresh!();
        expect([...list.querySelectorAll('[data-tool-batch-label]')].map(el => el.textContent)).toEqual(['3 tools called', '1 tool called']);
    } finally { ctx.fns.procs.db.close({}); await window.happyDOM.close(); }
});

test("assistant Markdown renders history and streaming text without activating HTML or unsafe links", async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, "../..") });
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    const source = '# Heading\n\n**Bold** and *italic*, `inline`.\n\n- First\n- Second\n\n```js\nconst html = "<img src=x>";\n```\n\n[Docs](https://example.com/docs) [bad](javascript:alert(1)) [encoded](java&#x73;cript:alert(1))\n\n![tracking](https://example.com/pixel)\n\n<img src=x onerror=alert(1)><button hx-post="/_agent/submit">Bad</button><script>bad()</script>\n\n| A | B |\n| --- | --- |\n| one | two |';
    const state: any = { configured: true, entries: [{ model: [
        { role: 'user', content: '**Keep user text literal**' },
        { role: 'assistant', content: [{ type: 'text', text: source }] },
        { role: 'toolResult', toolCallId: 'markdown-tool', toolName: 'read', content: [{ type: 'text', text: '**Tool output is literal**' }], isError: false },
    ] }], docs: { 'pi.live': { run: { taskId: 'run' }, generation: { message: { role: 'assistant', content: [{ type: 'text', text: '**Streaming' }] } } } } };
    let refresh: (() => Promise<void>) | undefined;
    let renderRequests = 0;
    const fetch = async (url: string, opts?: { body: string }) => {
        if (url === '/ui/markdown') {
            renderRequests++;
            const res = await ctx.fns.procs.http.dispatch({ url, method: 'POST', body: opts!.body, headers: { 'content-type': 'application/json' } });
            return new window.Response(await res.text(), { status: res.status });
        }
        return new window.Response(JSON.stringify(state));
    };
    const run = new Function('document', 'fetch', 'crypto', 'Event', 'setTimeout', agentScript);
    try {
        window.document.write(ctx.fns.ui.layout({ main: 'Page' }));
        run(window.document, fetch, window.crypto, window.Event, (fn: () => Promise<void>) => { refresh = fn; });
        await Bun.sleep(20);
        const document = window.document;
        const list = document.querySelector('[data-agent-messages]')!;
        const prose = list.querySelector('.asx-markdown')!;
        expect(prose.innerHTML).toContain('<h1>Heading</h1>');
        expect(prose.querySelector('h1')!.textContent).toBe('Heading');
        expect(prose.querySelector('strong')!.textContent).toBe('Bold');
        expect(prose.querySelector('em')!.textContent).toBe('italic');
        expect(prose.querySelectorAll('ul > li').length).toBe(2);
        expect(prose.querySelector('pre > code')!.textContent).toContain('<img src=x>');
        expect(prose.querySelector('table tbody td')!.textContent).toBe('one');
        expect(prose.querySelector('a[href="https://example.com/docs"]')).not.toBeNull();
        expect([...prose.querySelectorAll('a')].filter(a => /^(javascript|data|vbscript):/i.test(a.getAttribute('href') ?? '')).length).toBe(0);
        expect(prose.querySelector('img,button,script,style,[hx-post],[onerror]')).toBeNull();
        expect(list.querySelector('[data-sender=user] strong')).toBeNull();
        expect(list.querySelector('[data-tool-result] pre')!.textContent).toBe('**Tool output is literal**');
        state.docs['pi.live'].generation.message.content[0].text = '**Streaming complete**';
        await refresh!();
        expect([...list.querySelectorAll('.asx-markdown strong')].at(-1)!.textContent).toBe('Streaming complete');
        expect(document.querySelector('[data-agent-status]')!.textContent).toBe('Working…');
        expect(renderRequests).toBe(2);
        await refresh!();
        expect(renderRequests).toBe(2); // unchanged history is not formatted again
        const invalid = await ctx.fns.procs.http.dispatch({ url: '/ui/markdown', method: 'POST', body: { texts: [42] } });
        expect(invalid.status).toBe(400);
    } finally { ctx.fns.procs.db.close({}); await window.happyDOM.close(); }
});

test("the chat header clears the messages only after a confirmation, and redraws", async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, "../..") });
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    const calls: string[] = [];
    let confirmed = true;
    let cleared = false;
    const fetch = async (url: string, init?: any) => {
        calls.push(`${init?.method ?? "GET"} ${String(url)}`);
        if (String(url).endsWith("/reset")) { cleared = true; return new window.Response(JSON.stringify({ ok: true })); }
        if (String(url).endsWith("/state")) return new window.Response(JSON.stringify({ configured: true, entries: cleared ? [] : [{ model: [{ role: "assistant", content: [{ type: "text", text: "Before clearing" }] }] }], docs: {} }));
        return new window.Response(JSON.stringify({}));
    };
    try {
        window.document.write(ctx.fns.ui.layout({ main: "Page" }));
        const view = { document: window.document, confirm: () => confirmed, location: { reload: () => { throw new Error("clearing reloads nothing"); } } };
        const run = new Function("document", "fetch", "crypto", "Event", "setTimeout", "window", agentScript);
        run(window.document, fetch, window.crypto, window.Event, (fn: () => void) => setTimeout(fn, 0), view);
        await Bun.sleep(20);
        const messages = () => window.document.querySelector("[data-agent-messages]")!.textContent ?? "";
        expect(messages()).toContain("Before clearing");
        window.document.querySelector<HTMLElement>("[data-agent-clear]")!.click();
        await Bun.sleep(200);
        expect(calls).toContain("POST /_agent/reset");
        // The transcript is gone from the panel; the page is not reloaded and nothing else is touched.
        expect(messages()).not.toContain("Before clearing");
        // Cancelling leaves the conversation alone.
        confirmed = false;
        calls.length = 0;
        window.document.querySelector<HTMLElement>("[data-agent-clear]")!.click();
        await Bun.sleep(50);
        expect(calls).not.toContain("POST /_agent/reset");
    } finally { await window.happyDOM.close(); }
});
