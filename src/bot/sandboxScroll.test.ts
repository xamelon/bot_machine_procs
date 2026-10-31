import { test, expect } from 'bun:test';
import { Window } from 'happy-dom';

test('sandbox scroll follows a replaced chat container after htmx settle', async () => {
    const window = new Window();
    try {
        const make = () => {
            window.document.body.innerHTML = '<div class="bot-sandbox-chat"><div class="asx-chat-layout__messages"></div></div>';
            const node = window.document.querySelector('.asx-chat-layout__messages')!;
            Object.defineProperty(node, 'scrollHeight', { value: 1200 });
            return node;
        };
        const first = make();
        const script = await Bun.file(import.meta.dir + '/$script_sandbox.js').text();
        new Function('document', 'requestAnimationFrame', script)(window.document, (fn: Function) => fn());
        expect(first.scrollTop).toBe(1200);
        const next = make();
        window.document.dispatchEvent(new window.Event('htmx:afterSettle'));
        expect(next.scrollTop).toBe(1200);
    } finally { await window.happyDOM.close(); }
});
