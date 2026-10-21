import { test, expect } from 'bun:test';
import { resolve } from 'node:path';
import { Window } from 'happy-dom';
import { testCtx } from '../$test';

test('chat collapse keeps the conversation and composer, restores focus and persists width/state', async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, '../..') });
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    window.matchMedia = (() => ({ matches: true, addEventListener() {} })) as any;
    const html = ctx.fns.ui.layout({ main: 'Page' });
    const run = new Function('document', 'window', await Bun.file(resolve(import.meta.dir, '$script_workbench.js')).text());
    const mount = () => {
        window.document.body.innerHTML = html;
        const root = window.document.querySelector<HTMLElement>('.bot-workspace')!;
        root.getBoundingClientRect = (() => ({ width: 1000 })) as any;
        const panel = root.querySelector<HTMLElement>('.agent-panel')!;
        panel.getBoundingClientRect = (() => ({ width: 500 })) as any;
        run(window.document, window);
        return { root, panel };
    };
    try {
        let { root, panel } = mount();
        expect(root.style.getPropertyValue('--asx-resizable-size')).toBe('61.4%');
        const input = panel.querySelector<HTMLTextAreaElement>('textarea[name=text]')!;
        input.value = 'Keep my unsent prompt';
        const scroll = panel.querySelector<HTMLElement>('.asx-chat-layout')!;
        Object.defineProperties(scroll, { scrollHeight: { value: 1000 }, clientHeight: { value: 200 } });
        scroll.scrollTop = 120;
        root.dispatchEvent(new window.CustomEvent('asx:resize'));
        expect(JSON.parse(window.localStorage.getItem('bot.chat.layout')!).width).toBe(500);
        root.querySelector<HTMLButtonElement>('[data-agent-collapse]')!.click();
        expect(root.dataset.chatCollapsed).toBe('true');
        expect(panel.hidden).toBe(true);
        expect(root.querySelector<HTMLElement>('.agent-rail')!.hidden).toBe(false);
        expect(root.querySelector<HTMLElement>('[data-asx-resize-handle]')!.hidden).toBe(true);
        expect(window.document.activeElement).toBe(root.querySelector('[data-agent-open]'));
        expect(input.value).toBe('Keep my unsent prompt');
        expect(JSON.parse(window.localStorage.getItem('bot.chat.layout')!).collapsed).toBe(true);
        scroll.scrollTop = 0;
        root.querySelector<HTMLButtonElement>('[data-agent-open]')!.click();
        expect(scroll.scrollTop).toBe(120);
        expect(input.value).toBe('Keep my unsent prompt');
        root.querySelector<HTMLButtonElement>('[data-agent-collapse]')!.click();
        ({ root, panel } = mount());
        expect(panel.hidden).toBe(true);
        expect(root.style.getPropertyValue('--asx-resizable-size')).toBe('49.4%');
        root.querySelector<HTMLButtonElement>('[data-agent-open]')!.click();
        expect(panel.hidden).toBe(false);
        expect(root.querySelector<HTMLElement>('.agent-rail')!.hidden).toBe(true);
        expect(window.document.activeElement).toBe(root.querySelector('[data-agent-collapse]'));
        expect(root.querySelector('[data-agent-collapse]')!.getAttribute('aria-expanded')).toBe('true');
        expect(JSON.parse(window.localStorage.getItem('bot.chat.layout')!).collapsed).toBe(false);
    } finally { await window.happyDOM.close(); }
});

test('chat controls still work when browser storage is unavailable', async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, '../..') });
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    window.matchMedia = (() => ({ matches: false, addEventListener() {} })) as any;
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage denied'); } });
    try {
        window.document.body.innerHTML = ctx.fns.ui.layout({ main: 'Page' });
        const run = new Function('document', 'window', await Bun.file(resolve(import.meta.dir, '$script_workbench.js')).text());
        expect(() => run(window.document, window)).not.toThrow();
        window.document.querySelector<HTMLButtonElement>('[data-agent-collapse]')!.click();
        expect(window.document.querySelector<HTMLElement>('.agent-panel')!.hidden).toBe(true);
        window.document.querySelector<HTMLButtonElement>('[data-agent-open]')!.click();
        expect(window.document.querySelector<HTMLElement>('.agent-panel')!.hidden).toBe(false);
    } finally { await window.happyDOM.close(); }
});
