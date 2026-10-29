import { test, expect } from 'bun:test';
import { testCtx } from '../$test';

test('VK name enrichment does not block inbox, deduplicates and preserves existing names', async () => {
    const ctx = await testCtx();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let calls = 0;
    ctx.state.registry.bot.platformFetch = async () => {
        calls++; await gate;
        return { response: Response.json({ response: [{ id: 42, first_name: 'Иван', last_name: 'Иванов' }] }) };
    };
    try {
        const connection = ctx.fns.bot.saveConnection({ channel: 'vk', name: 'VK', publicId: 'vk-names', credentials: { group_access_token: 'test' } });
        ctx.fns.bot.ingest({ connectionId: connection.id, input: { channel: 'vk', external_id: '42', kind: 'user_message', text: 'hi' }, idempotencyKey: 'name-1' });
        expect((await ctx.fns.bot.processInbox({})).processed).toBe(1);
        expect(calls).toBe(1);
        const user = ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_users' })[0];
        await ctx.fns.bot.fillUserName({ userId: user.id });
        expect(calls).toBe(1);
        release();
        await Bun.sleep(10);
        expect(ctx.fns.procs.db.select({ sql: 'SELECT display_name FROM bot_users' })[0].display_name).toBe('Иван Иванов');
        await ctx.fns.bot.fillUserName({ userId: user.id });
        expect(calls).toBe(1);
    } finally { release(); ctx.fns.procs.db.close({}); }
});

test('VK profile failures leave inbox successful and apply a retry cooldown', async () => {
    const ctx = await testCtx();
    let calls = 0;
    ctx.state.registry.bot.platformFetch = async () => { calls++; return { response: Response.json({ error: { error_code: 5 } }) }; };
    try {
        const connection = ctx.fns.bot.saveConnection({ channel: 'vk', name: 'VK', publicId: 'vk-failure', credentials: { group_access_token: 'test' } });
        ctx.fns.bot.ingest({ connectionId: connection.id, input: { channel: 'vk', external_id: '42', kind: 'user_message' }, idempotencyKey: 'failure' });
        expect((await ctx.fns.bot.processInbox({})).failed).toBe(0);
        await Bun.sleep(10);
        const user = ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_users' })[0];
        await ctx.fns.bot.fillUserName({ userId: user.id });
        expect(calls).toBe(1);
        expect(user.display_name).toBeNull();
    } finally { ctx.fns.procs.db.close({}); }
});
