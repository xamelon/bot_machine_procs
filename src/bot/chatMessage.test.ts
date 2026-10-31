import { test, expect } from 'bun:test';
import { testCtx } from '../$test';
import { Window } from 'happy-dom';

test('shared renderer shows safe media and keyboard; only sandbox submits callbacks', async () => {
    const ctx = await testCtx();
    const window = new Window();
    try {
        const opts = { payload: { text: '<hello>', keyboard_mode: 'reply', button_rows: [[{ label: 'Go', payload: 'next' }]], attachments: [{ type: 'photo', url: 'https://example.org/photo.jpg' }] }, inbound: false, author: 'Bot', at: new Date().toISOString() };
        window.document.body.innerHTML = ctx.fns.bot.chatMessage(opts);
        expect(window.document.querySelector('button')?.disabled).toBe(true);
        expect(window.document.querySelector('img')?.loading).toBe('lazy');
        expect(window.document.body.innerHTML).toContain('&lt;hello&gt;');
        const bubble = window.document.querySelector('.asx-chat-message-bubble')!;
        expect(bubble.querySelector('.asx-chat-message-bubble__name')).toBeNull();
        expect(bubble.querySelector('button')).not.toBeNull();
        expect(bubble.querySelector('img')).not.toBeNull();
        expect(bubble.querySelector('.asx-chat-message-metadata')).toBeNull();
        expect(window.document.querySelector('.asx-chat-message__content > .asx-chat-message-metadata')?.textContent).toContain('Bot');
        window.document.body.innerHTML = ctx.fns.bot.chatMessage({ ...opts, sandboxRecipient: 'tester' });
        const button = window.document.querySelector('button')!;
        expect(button.disabled).toBe(false);
        expect(button.getAttribute('hx-post')).toBe('/bot/sandbox');
        expect(JSON.parse(button.getAttribute('hx-vals')!)).toEqual({ external_id: 'tester', text: 'Go', payload: 'next' });
    } finally { await window.happyDOM.close(); ctx.fns.procs.db.close({}); }
});

test('sandbox participant perspective reverses sides without changing profile defaults', async () => {
    const ctx = await testCtx();
    const window = new Window();
    try {
        for (const inbound of [true, false]) {
            for (const perspective of ['operator', 'participant'] as const) {
                window.document.body.innerHTML = ctx.fns.bot.chatMessage({ payload: { text: 'Message' }, inbound, author: 'Test', at: new Date().toISOString(), perspective });
                const mine = perspective === 'participant' ? inbound : !inbound;
                expect(window.document.querySelector('.asx-chat-message')?.getAttribute('data-sender')).toBe(mine ? 'user' : 'assistant');
                expect(window.document.querySelector('.asx-chat-message-bubble')?.getAttribute('data-variant')).toBe(mine ? 'filled' : 'ghost');
            }
        }
    } finally { await window.happyDOM.close(); ctx.fns.procs.db.close({}); }
});

test('button clicks show a readable label once instead of technical payload', async () => {
    const ctx = await testCtx();
    try {
        const html = ctx.fns.bot.chatMessage({ payload: { text: 'Меню', payload: 'menu_internal' }, inbound: true, author: 'Tester', at: new Date().toISOString() });
        expect(html).toContain('Нажал кнопку «Меню»');
        expect(html).not.toContain('menu_internal');
        expect(html).not.toContain('Button:');
    } finally { ctx.fns.procs.db.close({}); }
});
