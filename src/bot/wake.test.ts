import { test, expect } from 'bun:test';
import { testCtx } from '../$test';
import start from './$start';
import stop from './$stop';

const tick = () => Bun.sleep(20);

test('wake coalesces bursts and retains signals received during a running drain', async () => {
    const ctx = await testCtx();
    ctx.state.bot = { workersEnabled: true };
    let calls = 0, active = 0, maximum = 0;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    ctx.state.registry.bot.processInbox = async () => {
        calls++; maximum = Math.max(maximum, ++active);
        if (calls === 1) await gate;
        active--; return { more: false };
    };
    try {
        for (let i = 0; i < 10; i++) ctx.fns.bot.wake({ queue: 'inbox' });
        await tick(); expect(calls).toBe(1);
        for (let i = 0; i < 10; i++) ctx.fns.bot.wake({ queue: 'inbox' });
        release(); await tick();
        expect(calls).toBe(2); expect(maximum).toBe(1);
        ctx.fns.bot.wake({ queue: 'inbox' });
        stop(ctx, null, {}); await tick(); expect(calls).toBe(2);
    } finally { release(); stop(ctx, null, {}); ctx.fns.procs.db.close({}); }
});

test('ingest to delivery runs without a polling tick and drains beyond batch limits', async () => {
    const ctx = await testCtx({ env: { BOT_POLL_MS: '60000', BOT_PROCESS_LIMIT: '1', BOT_SEND_LIMIT: '1' } });
    const connection = ctx.fns.bot.saveConnection({ channel: 'echo', name: 'Wake', publicId: 'wake-test' });
    ctx.fns.bot.save({ definition: { id: 'wake-flow', start_node_id: 'hello', nodes: [{ id: 'hello', type: 'message', text: 'Hello' }] }, connections: ['wake-test'] });
    const lifecycle = start(ctx, null);
    try {
        for (let i = 0; i < 3; i++) ctx.fns.bot.ingest({ connectionId: connection.id, input: { kind: 'manual', channel: 'echo', external_id: String(i), flow_slug: 'wake-flow' }, idempotencyKey: `wake:${i}` });
        for (let i = 0; i < 30; i++) {
            if (ctx.fns.procs.db.select({ sql: "SELECT COUNT(*) AS n FROM bot_outbox_messages WHERE status = 'sent'" })[0].n === 3) break;
            await tick();
        }
        expect(ctx.fns.procs.db.select({ sql: "SELECT status FROM bot_inbox_events" }).map((r: any) => r.status)).toEqual(['processed', 'processed', 'processed']);
        expect(ctx.fns.procs.db.select({ sql: "SELECT status FROM bot_outbox_messages" }).map((r: any) => r.status)).toEqual(['sent', 'sent', 'sent']);
    } finally { stop(ctx, null, lifecycle); await tick(); ctx.fns.procs.db.close({}); }
});
