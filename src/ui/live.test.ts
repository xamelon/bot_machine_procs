import { test, expect } from 'bun:test';
import { resolve } from 'node:path';
import { Window } from 'happy-dom';
import { testCtx } from '../$test';

const script = await Bun.file(resolve(import.meta.dir, '$script_live.js')).text();

function browser(storage = new Map<string, string>()) {
    const window = new Window({ settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true } });
    window.document.write('<meta name="bot-live-revision" content="2"><div class="bot-workspace"><form data-asx-chat-composer><textarea name="text"></textarea><button type="submit">Send</button></form></div>');
    let reloads = 0, nextTimer = 0;
    const timers = new Map<number, () => void>();
    const run = new Function('document', 'window', 'sessionStorage', 'Event', 'setTimeout', 'clearTimeout', script);
    const install = () => run(window.document, { location: { reload: () => reloads++ }, addEventListener: window.addEventListener.bind(window) }, {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
    }, window.Event, (fn: () => void) => { timers.set(++nextTimer, fn); return nextTimer; }, (id: number) => timers.delete(id));
    return {
        window, storage, install,
        input: window.document.querySelector('textarea')!,
        button: window.document.querySelector('button')!,
        event: (detail: object) => window.document.dispatchEvent(new window.CustomEvent('hyper-events', { detail })),
        flush: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); },
        get reloads() { return reloads; },
        get pending() { return timers.size; },
    };
}

test('bot reloads once per burst, restores chat draft and catches missed hidden-tab changes', async () => {
    const first = browser();
    let second: ReturnType<typeof browser> | undefined;
    try {
        first.install(); first.install();
        first.event({ type: 'hello', revision: 2 });
        first.event({ type: 'presence' });
        expect(first.pending).toBe(0);
        first.input.value = 'Unsent change';
        first.input.setSelectionRange(3, 7);
        first.event({ type: 'reload', revision: 3 });
        first.event({ type: 'reload', revision: 4 });
        expect(first.pending).toBe(1);
        first.flush();
        expect(first.reloads).toBe(1);
        first.event({ type: 'reload', revision: 5 }); first.flush();
        expect(first.reloads).toBe(1);
        second = browser(first.storage); second.install();
        expect(second.input.value).toBe('Unsent change');
        expect(second.input.selectionStart).toBe(3);
        expect(second.storage.size).toBe(0);
        second.event({ type: 'hello', revision: 5 }); second.flush();
        expect(second.reloads).toBe(1);
    } finally { await first.window.happyDOM.close(); await second?.window.happyDOM.close(); }
});

test('reload waits for submission and preserves uncertain-transport retry identity', async () => {
    const first = browser();
    let second: ReturnType<typeof browser> | undefined;
    try {
        first.install(); first.input.value = 'Retry safely';
        first.input.form!.dataset.requestId = 'durable-id';
        first.input.form!.dataset.pendingText = first.input.value;
        first.button.disabled = true;
        first.event({ type: 'reload' }); first.flush();
        expect(first.reloads).toBe(0);
        expect(first.pending).toBe(1);
        first.button.disabled = false; first.flush();
        expect(first.reloads).toBe(1);
        second = browser(first.storage); second.install();
        expect(second.input.form!.dataset.requestId).toBe('durable-id');
        expect(second.input.form!.dataset.pendingText).toBe('Retry safely');
    } finally { await first.window.happyDOM.close(); await second?.window.happyDOM.close(); }
});

test('file changes wait for confirmed agent idle and reload once after the run', async () => {
    const page = browser();
    try {
        const panel = page.window.document.createElement('aside');
        panel.className = 'agent-panel';
        page.window.document.querySelector('.bot-workspace')!.append(panel);
        page.install();
        page.event({ type: 'reload', revision: 3 }); page.flush();
        expect(page.reloads).toBe(0); // State has not arrived yet.
        panel.dataset.agentBusy = 'true';
        for (let revision = 4; revision < 12; revision++) {
            page.event({ type: 'reload', revision }); page.flush();
            expect(page.reloads).toBe(0);
        }
        panel.dataset.agentBusy = 'false'; page.flush();
        expect(page.reloads).toBe(1);
        page.event({ type: 'reload', revision: 12 }); page.flush();
        expect(page.reloads).toBe(1);
    } finally { await page.window.happyDOM.close(); }
});

test('reload revision is broadcast and included in reconnect hello and shell', async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, '../..') });
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
        const events: any[] = [];
        const unsubscribe = ctx.fns.procs.events.subscribe({ handler: (event: any) => events.push(event) });
        ctx.fns.procs.events.reload({}); ctx.fns.procs.events.reload({}); unsubscribe();
        expect(events.map(event => event.revision)).toEqual([1, 2]);
        expect(ctx.fns.ui.layout({ main: 'Page' })).toContain('name="bot-live-revision" content="2"');
        expect(ctx.fns.ui.layout({ main: 'Page' })).toContain('/ui/live.js');
        const response = await ctx.fns.procs.http.dispatch({ url: '/procs/events' });
        reader = response.body!.getReader();
        const hello = new TextDecoder().decode((await reader.read()).value);
        expect(JSON.parse(hello.slice(6)).revision).toBe(2);
    } finally { await reader?.cancel(); ctx.fns.procs.db.close({}); }
});
