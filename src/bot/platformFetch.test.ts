import { test, expect } from 'bun:test';
import { testCtx } from '../$test';

async function setup() {
    const ctx = await testCtx();
    let sequence = 0;
    const connection = (channel: string) => ctx.fns.bot.saveConnection({ channel, name: channel, publicId: `${channel}-${++sequence}`, credentials: {
        bot_token: 'telegram-test', group_access_token: 'vk-test', access_token: 'max-test',
    } }).id;
    const queue = (channel: string, connectionId: number, recipient = String(++sequence)) => ctx.fns.procs.db.insert({ into: 'bot_outbox_messages', values: {
        bot_channel_connection_id: connectionId, channel, external_id: recipient, idempotency_key: `test:${++sequence}`,
        payload: JSON.stringify({ external_id: recipient, text: 'Hello' }), created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    } }).id;
    return { ctx, connection, queue };
}

test('Telegram flood pauses every connection, survives runtime state reset and does not starve other platforms', async () => {
    const { ctx, connection, queue } = await setup();
    const first = queue('telegram', connection('telegram'));
    const untouched = queue('telegram', connection('telegram'));
    for (let i = 0; i < 25; i++) queue('telegram', connection('telegram'));
    queue('max', connection('max'));
    const original = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (url: any) => {
        calls.push(String(url));
        return String(url).includes('telegram.org')
            ? Response.json({ ok: false, error_code: 429, parameters: { retry_after: 90 } }, { status: 429 })
            : Response.json({ message: { body: { mid: 'sent' } } });
    }) as any;
    try {
        expect(await ctx.fns.bot.sendOutbox({ limit: 20 })).toEqual({ sent: 1, failed: 1, skipped: 0 });
        expect(calls).toHaveLength(2);
        const rows = ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_outbox_messages WHERE id IN (?, ?) ORDER BY id', params: [first, untouched] });
        expect(rows[0].status).toBe('failed');
        expect(Date.parse(rows[0].next_retry_at) - Date.now()).toBeGreaterThan(88_000);
        expect(rows[1]).toMatchObject({ status: 'pending', attempts: 0, next_retry_at: null });
        ctx.state.bot = {};
        expect(await ctx.fns.bot.sendOutbox({})).toEqual({ sent: 0, failed: 0, skipped: 0 });
        expect(calls).toHaveLength(2);
        await expect(ctx.fns.bot.platformFetch({ channel: 'telegram', url: 'https://api.telegram.org/test' })).rejects.toThrow('rate limited');
        expect(calls).toHaveLength(2);
    } finally { globalThis.fetch = original; }
});

test('each platform recognizes its rate-limit responses, not permanent VK photo errors', async () => {
    const { ctx } = await setup();
    const original = globalThis.fetch;
    try {
        for (const code of [6, 9, 29, 129]) {
            ctx.fns.procs.db.run({ sql: 'DELETE FROM bot_platform_limits' });
            globalThis.fetch = (async () => Response.json({ error: { error_code: code, error_msg: 'VK error' } })) as any;
            const result = await ctx.fns.bot.platformFetch({ channel: 'vk', url: 'https://api.vk.com/method/messages.send' });
            expect(result.retryAfter).toBe(code === 129 ? undefined : 2);
            expect((ctx.fns.procs.db.select({ sql: "SELECT paused_until FROM bot_platform_limits WHERE channel = 'vk'" })[0]?.paused_until ?? 0) > Date.now()).toBe(code !== 129);
        }
        globalThis.fetch = (async () => new Response('Too many requests', { status: 429, headers: { 'retry-after': '12' } })) as any;
        expect((await ctx.fns.bot.platformFetch({ channel: 'max', url: 'https://platform-api2.max.ru/me' })).retryAfter).toBe(12);
        globalThis.fetch = (async () => Response.json({ ok: false, error_code: 429, parameters: { retry_after: 7 } })) as any;
        expect((await ctx.fns.bot.platformFetch({ channel: 'telegram', url: 'https://api.telegram.org/test' })).retryAfter).toBe(7);
    } finally { globalThis.fetch = original; }
});

test('Retry-After HTTP dates are respected and repeated limits without a delay use capped backoff', async () => {
    const { ctx } = await setup();
    const original = globalThis.fetch;
    const until = new Date(Date.now() + 61_000).toUTCString();
    globalThis.fetch = (async () => new Response('', { status: 429, headers: { 'retry-after': until } })) as any;
    try {
        const result = await ctx.fns.bot.platformFetch({ channel: 'max', url: 'https://platform-api2.max.ru/me' });
        expect(result.retryAfter).toBeGreaterThanOrEqual(60);
        expect(result.retryAfter).toBeLessThanOrEqual(61);
        expect(ctx.fns.bot.pausePlatform({ channel: 'telegram', retryAfter: 900 })).toBe(900);
        // An earlier expiry cannot shorten a server-mandated pause.
        expect(ctx.fns.bot.pausePlatform({ channel: 'telegram', retryAfter: 1 })).toBe(900);
        const delays = Array.from({ length: 10 }, () => ctx.fns.bot.pausePlatform({ channel: 'vk' }));
        expect(delays).toEqual([2, 4, 8, 16, 32, 64, 128, 256, 300, 300]);
        ctx.fns.procs.db.run({ sql: "UPDATE bot_platform_limits SET paused_until = 0, last_limit_at = 0 WHERE channel = 'vk'" });
        expect(ctx.fns.bot.pausePlatform({ channel: 'vk' })).toBe(2);
    } finally { globalThis.fetch = original; }
});

test('concurrent API calls are paced per platform, including calls from different connections', async () => {
    const { ctx } = await setup();
    const original = globalThis.fetch;
    const starts: number[] = [];
    globalThis.fetch = (async () => { starts.push(Date.now()); return Response.json({ response: 1 }); }) as any;
    try {
        await Promise.all(Array.from({ length: 4 }, () => ctx.fns.bot.platformFetch({ channel: 'vk', url: 'https://api.vk.com/method/messages.send' })));
        expect(starts).toHaveLength(4);
        for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(59);
    } finally { globalThis.fetch = original; }
});

test('recipient pacing skips queued MAX messages without increasing attempts or blocking Telegram', async () => {
    const { ctx, connection, queue } = await setup();
    const max = connection('max');
    queue('max', max, '42');
    const second = queue('max', max, '42');
    queue('telegram', connection('telegram'), '42');
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: any) => String(url).includes('telegram.org') ? Response.json({ ok: true, result: { message_id: 1 } }) : Response.json({ message: { body: { mid: '1' } } })) as any;
    try {
        expect(await ctx.fns.bot.sendOutbox({})).toEqual({ sent: 2, failed: 0, skipped: 0 });
        expect(ctx.fns.procs.db.select({ sql: 'SELECT status, attempts FROM bot_outbox_messages WHERE id = ?', params: [second] })[0]).toEqual({ status: 'pending', attempts: 0 });
        expect(ctx.fns.bot.pending({})).toHaveLength(0);
        await Bun.sleep(510);
        expect(await ctx.fns.bot.sendOutbox({})).toEqual({ sent: 1, failed: 0, skipped: 0 });
    } finally { globalThis.fetch = original; }
});

test('Telegram private/group message gaps are durable and group messages cannot block other chats', async () => {
    const { ctx, connection, queue } = await setup();
    const telegram = connection('telegram');
    queue('telegram', telegram, '-42'); queue('telegram', telegram, '-42');
    queue('telegram', telegram, '42'); queue('telegram', telegram, '42');
    const original = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({ ok: true, result: { message_id: 1 } })) as any;
    try {
        expect(await ctx.fns.bot.sendOutbox({})).toEqual({ sent: 2, failed: 0, skipped: 0 });
        const rows = ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_recipient_limits ORDER BY external_id' });
        expect(rows).toHaveLength(2);
        expect(rows[0].next_send_at - Date.now()).toBeGreaterThan(2900);
        expect(rows[1].next_send_at - Date.now()).toBeGreaterThan(900);
        expect(ctx.fns.bot.pending({})).toHaveLength(0);
    } finally { globalThis.fetch = original; }
});

test('network failures stay retryable and a pause raised during VK media preparation survives the thrown error', async () => {
    const { ctx, connection, queue } = await setup();
    const id = queue('vk', connection('vk'));
    const original = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error('Network unavailable'); }) as any;
    try {
        expect(await ctx.fns.bot.sendOutbox({})).toEqual({ sent: 0, failed: 1, skipped: 0 });
        const pause = ctx.fns.bot.pausePlatform({ channel: 'vk', retryAfter: 80 });
        ctx.fns.bot.failOutbox({ id, error: 'VK photo upload failed' });
        const row = ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_outbox_messages WHERE id = ?', params: [id] })[0];
        expect(row.status).toBe('failed');
        expect(Date.parse(row.next_retry_at) - Date.now()).toBeGreaterThan((pause - 1) * 1000);
    } finally { globalThis.fetch = original; }
});
