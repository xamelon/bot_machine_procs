import { test, expect } from 'bun:test';
import { Window } from 'happy-dom';
import { testCtx } from '../$test';

test('user message appears immediately while submit is still awaiting the server', async () => {
    const ctx = await testCtx({ root: import.meta.dir + '/../..' });
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    window.fetch = (async (url: any) => {
        if (String(url).endsWith('/submit')) { await gate; return new window.Response(JSON.stringify({ error: 'Unavailable' }), { status: 503 }); }
        return new window.Response(JSON.stringify({ configured: true, entries: [] }));
    }) as any;
    try {
        window.EventSource = class {
            onmessage: any;
            constructor() { void window.fetch('/_agent/state').then(r => r.json()).then(data => this.onmessage?.({ data: JSON.stringify({ type: 'snapshot', ...data }) })); }
            close() {}
        } as any;
        window.document.write(ctx.fns.ui.layout({ main: 'Page' }));
        const script = await Bun.file(import.meta.dir + '/$script_agent.js').text();
        new Function('document', 'fetch', 'crypto', 'Event', 'FileReader', 'setTimeout', script)(window.document, window.fetch, window.crypto, window.Event, window.FileReader, window.setTimeout.bind(window));
        await Bun.sleep(20);
        const input = window.document.querySelector('textarea[name="text"]') as any;
        input.value = 'Immediate message';
        window.document.querySelector('[data-asx-chat-composer]')!.dispatchEvent(new window.Event('submit', { cancelable: true }));
        const pending = window.document.querySelector('[data-agent-pending]')!;
        expect(pending.textContent).toContain('Immediate message');
        expect(pending.textContent).toContain('Sending…');
        release(); await Bun.sleep(30);
        expect(input.value).toBe('Immediate message');
        expect(pending.textContent).toContain('Not confirmed');
    } finally { release(); await window.happyDOM.close(); ctx.fns.procs.db.close({}); }
});
