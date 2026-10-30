import { test, expect } from 'bun:test';
import { testCtx } from '../$test';

const tick = () => Bun.sleep(20);

test('inbox runs other dialogs while an action waits and preserves same-dialog order', async () => {
    const ctx = await testCtx();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const calls: string[] = [];
    ctx.fns.procs.hooks.register({ name: 'bot.action.slow', id: 'concurrency', fn: async (_ctx: any, _session: any, opts: any) => {
        calls.push(opts.input.external_id);
        if (opts.input.external_id === 'slow') await gate;
        return {};
    } });
    const c = ctx.fns.bot.saveConnection({ channel: 'echo', name: 'Concurrency', publicId: 'concurrent' });
    ctx.fns.bot.save({ definition: { id: 'concurrent-flow', start_node_id: 'action', nodes: [{ id: 'action', type: 'action', action: 'slow' }] }, connections: ['concurrent'] });
    for (const [i, id] of ['slow', 'slow', 'fast'].entries()) ctx.fns.bot.ingest({ connectionId: c.id, input: { kind: 'manual', channel: 'echo', external_id: id, flow_slug: 'concurrent-flow', session_mode: 'restart' }, idempotencyKey: `in:${i}` });
    const drain = ctx.fns.bot.processInbox({ limit: 10 });
    try {
        await tick();
        expect(calls).toEqual(['slow', 'fast']);
        release(); expect((await drain).processed).toBe(3);
        expect(calls).toEqual(['slow', 'fast', 'slow']);
    } finally { release(); await drain; ctx.fns.procs.db.close({}); }
});

test('outbox isolates slow dialogs and retries cannot be overtaken', async () => {
    const ctx = await testCtx();
    const c = ctx.fns.bot.saveConnection({ channel: 'echo', name: 'Outbox', publicId: 'parallel-out' });
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const calls: string[] = [];
    ctx.state.procs.hooks.handlers['bot.adapter.echo'].clear();
    ctx.fns.procs.hooks.register({ name: 'bot.adapter.echo', id: 'parallel-test', fn: async (_ctx: any, _session: any, opts: any) => {
        const text = opts.message.payload.text;
        calls.push(text);
        if (text === 'slow') await gate;
        return text === 'slow' ? { ok: false, error: 'retry later', retryAfter: 60 } : { ok: true };
    } });
    for (const [i, text] of ['slow', 'next', 'fast'].entries()) ctx.fns.procs.db.insert({ into: 'bot_outbox_messages', values: {
        bot_channel_connection_id: c.id, channel: 'echo', external_id: text === 'fast' ? '2' : '1', idempotency_key: `out:${i}`,
        payload: JSON.stringify({ external_id: text === 'fast' ? '2' : '1', text }), created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    } });
    const drain = ctx.fns.bot.sendOutbox({ limit: 10 });
    try {
        await tick(); expect(calls).toEqual(['slow', 'fast']);
        release(); expect(await drain).toMatchObject({ sent: 1, failed: 1 });
        expect(await ctx.fns.bot.sendOutbox({})).toMatchObject({ sent: 0, failed: 0 });
        expect(calls).toEqual(['slow', 'fast']);
    } finally { release(); await drain; ctx.fns.procs.db.close({}); }
});

test('platform timeout aborts network requests and background profiles yield to messages', async () => {
    const ctx = await testCtx({ env: { BOT_REQUEST_TIMEOUT_MS: '40' } });
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async (_url: any, init: any) => {
        calls++;
        return await new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
            if (init.signal.aborted) reject(init.signal.reason);
        });
    }) as any;
    try {
        await expect(ctx.fns.bot.platformFetch({ channel: 'vk', url: 'https://api.vk.com/test' })).rejects.toThrow();
        expect(calls).toBe(1);
        ctx.state.bot = { processing: true };
        await expect(ctx.fns.bot.platformFetch({ channel: 'vk', priority: 'background', url: 'https://api.vk.com/test' })).rejects.toThrow();
        expect(calls).toBe(1);
        await expect(ctx.fns.bot.mediaFetch({ url: 'https://media.test/image' })).rejects.toThrow();
        expect(calls).toBe(2);
    } finally { globalThis.fetch = original; ctx.fns.procs.db.close({}); }
});
