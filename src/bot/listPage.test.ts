import { test, expect } from 'bun:test';
import { testCtx } from '../$test';
import { Window } from 'happy-dom';

test('lists paginate in SQL, preserve filters and clamp invalid pages', async () => {
    const ctx = await testCtx();
    const window = new Window();
    try {
        const c = ctx.fns.bot.saveConnection({ channel: 'echo', name: 'Pages', publicId: 'pages' });
        for (let i = 0; i < 45; i++) ctx.fns.bot.ingest({ connectionId: c.id, input: { channel: 'echo', external_id: String(i), text: 'hello' }, idempotencyKey: `p:${i}` });
        const ids: string[][] = [];
        for (const page of [1, 2, 3]) {
            const r = await ctx.fns.procs.http.dispatch({ url: `/bot/inbox?page=${page}` });
            expect(r.status).toBe(200);
            window.document.body.innerHTML = await r.text();
            const rows = [...window.document.querySelectorAll('.asx-table tbody tr')].filter(n => !n.classList.contains('asx-table__detail'));
            expect(rows.length).toBe(page === 3 ? 5 : 20);
            ids.push(rows.map(n => n.querySelector('td')!.textContent!));
        }
        expect(new Set(ids.flat()).size).toBe(45);
        for (const path of ['users', 'chats', 'events', 'sessions', 'outbox']) expect((await ctx.fns.procs.http.dispatch({ url: `/bot/${path}?page=2` })).status).toBe(200);
        const r = await ctx.fns.procs.http.dispatch({ url: '/bot/inbox?page=999&q=hello' });
        window.document.body.innerHTML = await r.text();
        expect(window.document.querySelector('.asx-pagination a[href]')?.getAttribute('href')).toContain('q=hello');
        const last = await ctx.fns.procs.http.dispatch({ url: '/bot/inbox?page=999' });
        window.document.body.innerHTML = await last.text();
        expect(window.document.querySelector('.asx-pagination [aria-current="page"]')?.textContent?.trim()).toBe('3');
    } finally { await window.happyDOM.close(); ctx.fns.procs.db.close({}); }
});
