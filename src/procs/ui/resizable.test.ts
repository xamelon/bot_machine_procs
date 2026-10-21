import { test, expect } from 'bun:test';
import { Window } from 'happy-dom';
import { testCtx } from '../../$test';

test('resizable clamps pointer drags, ends on cancellation, and supports keyboard sizing', async () => {
    const ctx = await testCtx();
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    try {
        window.document.body.innerHTML = ctx.fns.procs.ui.resizable({ start: 'Page', end: 'Chat', initial: 60, min: 20, max: 80 });
        const root = window.document.querySelector<HTMLElement>('[data-asx-resizable]')!;
        root.getBoundingClientRect = (() => ({ left: 100, width: 1000 })) as any;
        const handle = root.querySelector<HTMLElement>('[data-asx-resize-handle]')!;
        (handle as any).setPointerCapture = () => {};
        let changes = 0;
        root.addEventListener('asx:resize', () => { changes++; });
        const run = new Function('document', 'window', 'CustomEvent', await Bun.file(new URL('./$script_structure.js', import.meta.url)).text());
        run(window.document, window, window.CustomEvent);
        const pointer = (type: string, x: number) => handle.dispatchEvent(new window.PointerEvent(type, { bubbles: true, pointerId: 1, button: 0, clientX: x }));
        pointer('pointerdown', 700);
        pointer('pointermove', 1100);
        expect(root.style.getPropertyValue('--asx-resizable-size')).toBe('80%');
        pointer('pointermove', 100);
        expect(root.style.getPropertyValue('--asx-resizable-size')).toBe('20%');
        pointer('pointercancel', 100);
        expect(changes).toBe(1);
        pointer('pointermove', 1000);
        expect(root.style.getPropertyValue('--asx-resizable-size')).toBe('20%');
        handle.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
        expect(handle.getAttribute('aria-valuenow')).toBe('21');
        handle.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, key: 'End' }));
        expect(handle.getAttribute('aria-valuenow')).toBe('80');
        handle.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));
        expect(handle.getAttribute('aria-valuenow')).toBe('20');
        expect(handle.getAttribute('role')).toBe('separator');
        expect(handle.getAttribute('aria-orientation')).toBe('vertical');
        expect(changes).toBe(4);
    } finally { await window.happyDOM.close(); }
});
