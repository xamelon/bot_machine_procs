import { test, expect } from 'bun:test';
import { testCtx } from '../$test';
import { Window } from 'happy-dom';

test('user transcript isolates connection and recipient, escapes content and paginates', async () => {
    const ctx = await testCtx();
    try {
        const a = ctx.fns.bot.saveConnection({ channel: 'echo', name: 'A', publicId: 'chat-a' });
        const b = ctx.fns.bot.saveConnection({ channel: 'echo', name: 'B', publicId: 'chat-b' });
        const now = new Date().toISOString();
        for (const [connection, recipient, text] of [[a.id, '1', '<script>alert(1)</script>'], [a.id, '2', 'other-person'], [b.id, '1', 'other-connection']] as const) {
            ctx.fns.bot.ingest({ connectionId: connection, input: { channel: 'echo', external_id: recipient, text }, idempotencyKey: text });
        }
        ctx.fns.procs.db.insert({ into: 'bot_outbox_messages', values: { bot_channel_connection_id: a.id, channel: 'echo', external_id: '1', idempotency_key: 'chat-out', payload: JSON.stringify({ text: 'bot-response', attachments: [{ type: 'photo', url: 'javascript:alert(1)', ref: 'photo1' }] }), status: 'failed', last_error: '<bad>', created_at: now, updated_at: now } });
        const user = { id: 123, bot_channel_connection_id: a.id, external_id: '1', display_name: 'Person' };
        const html = ctx.fns.bot.userChat({ user });
        expect(html).toContain('&lt;script&gt;');
        expect(html).not.toContain('<script>');
        expect(html).toContain('bot-response');
        expect(html).toContain('failed');
        expect(html).toContain('&lt;bad&gt;');
        expect(html).toContain('photo1');
        expect(html).not.toContain('javascript:');
        expect(html).not.toContain('other-person');
        expect(html).not.toContain('other-connection');
        for (let i = 0; i < 101; i++) ctx.fns.bot.ingest({ connectionId: a.id, input: { channel: 'echo', external_id: '1', text: `message-${i}` }, idempotencyKey: `page:${i}` });
        const window = new Window();
        window.document.body.innerHTML = ctx.fns.bot.userChat({ user });
        expect(window.document.querySelectorAll('.asx-chat-message')).toHaveLength(20);
        expect(window.document.querySelector('[data-variant="ghost"]')).not.toBeNull();
        const cursor = JSON.parse((window.document.querySelector('[data-user-chat]') as any).dataset.before);
        const first = new Set([...window.document.querySelectorAll('.asx-chat-message-bubble__body')].map(n => n.textContent));
        window.document.body.innerHTML = ctx.fns.bot.userChat({ user, before: cursor });
        expect(window.document.querySelectorAll('.asx-chat-message')).toHaveLength(20);
        for (const node of window.document.querySelectorAll('.asx-chat-message-bubble__body')) expect(first.has(node.textContent)).toBe(false);
        await window.happyDOM.close();
    } finally { ctx.fns.procs.db.close({}); }
});

test('operator send returns chat fragment, validates user and deduplicates retry', async () => {
    const ctx = await testCtx();
    try {
        const c = ctx.fns.bot.saveConnection({ channel: 'echo', name: 'Send', publicId: 'chat-send' });
        ctx.fns.bot.ingest({ connectionId: c.id, input: { channel: 'echo', external_id: 'sender', text: 'hi' }, idempotencyKey: 'chat-sender' });
        await ctx.fns.bot.processInbox({});
        const user = ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_users WHERE external_id = ?', params: ['sender'] })[0];
        for (let i = 0; i < 2; i++) {
            const body = new FormData(); body.set('text', 'operator reply'); body.set('requestId', 'stable');
            const response = await ctx.fns.procs.http.dispatch({ method: 'POST', url: `/bot/users/${user.id}/send`, body });
            expect(response.status).toBe(202);
            expect((await response.json()).html).toContain('operator reply');
        }
        expect(ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_outbox_messages' })).toHaveLength(1);
        const page = await ctx.fns.procs.http.dispatch({ url: `/bot/users/${user.id}` });
        const html = await page.text();
        expect(html).toContain('data-form="user-chat-send"');
        expect(html).not.toContain('hx-post="/bot/users/');
        expect((await ctx.fns.procs.http.dispatch({ method: 'POST', url: '/bot/users/999999/send', body: new FormData() })).status).toBe(404);
    } finally { ctx.fns.procs.db.close({}); }
});
