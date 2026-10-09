import { test, expect } from "bun:test";
import { testCtx } from "../$test";

const definition = { id: "a", start_node_id: "wait", nodes: [{ id: "wait", type: "input", input_key: "answer", next: "end" }, { id: "end", type: "end" }] };
const input = { channel: "echo", external_id: "1", kind: "user_message", flow_slug: "a" };
const connections = ["conn_echo"];
function ingest(ctx: Context, opts: { input: any; idempotencyKey: string }) {
    const connectionId = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = 'conn_echo'" })[0].id;
    return ctx.fns.bot.ingest({ ...opts, connectionId });
}

test("save validates before writing and rolls back a failed replacement", async () => {
    const ctx = await testCtx();
    expect(() => ctx.fns.bot.save({ definition: { ...definition, start_node_id: "missing" } })).toThrow("invalid flow");
    expect(ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_flows" })).toEqual([]);
    const trigger = { name: "start", channel: "*", type: "manual", match: { event: "start" }, start_node_id: "wait" };
    ctx.fns.bot.save({ definition, name: "original", triggers: [trigger] });
    ctx.fns.procs.db.exec({ sql: "CREATE TRIGGER reject_insert BEFORE INSERT ON bot_triggers BEGIN SELECT RAISE(ABORT, 'test failure'); END" });
    expect(() => ctx.fns.bot.save({ definition: { ...definition, version: 2 }, name: "changed", triggers: [trigger] })).toThrow("test failure");
    expect(ctx.fns.procs.db.select({ sql: "SELECT name FROM bot_flows" })[0].name).toBe("original");
    expect(ctx.fns.procs.db.select({ sql: "SELECT name FROM bot_triggers" })).toEqual([{ name: "start" }]);
    expect(JSON.parse(ctx.fns.procs.db.select({ sql: "SELECT definition FROM bot_flow_versions" })[0].definition)).toEqual(definition);
});

test("an unlinked flow does not run on that connection", async () => {
    const ctx = await testCtx();
    ctx.fns.bot.save({ definition: { id: "a", start_node_id: "m", nodes: [{ id: "m", type: "message", text: "no" }] }, triggers: [{ name: "start", channel: "echo", type: "command", match: { command: "start" }, start_node_id: "m" }] });
    ingest(ctx, { input: { channel: "echo", external_id: "z", kind: "user_message", text: "/start" }, idempotencyKey: "unlinked" });
    expect((await ctx.fns.bot.processInbox()).processed).toBe(1);
    expect(ctx.fns.bot.pending()).toEqual([]);
});

test("parallel processing cannot execute an action twice", async () => {
    const ctx = await testCtx();
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const started = new Promise<void>((resolve) => { entered = resolve; });
    let calls = 0;
    ctx.fns.procs.hooks.register({ name: "bot.action.wait", id: "test", fn: async () => { calls++; entered(); await gate; return {}; } });
    ctx.fns.bot.save({ definition: { id: "a", start_node_id: "action", nodes: [{ id: "action", type: "action", action: "wait" }] }, connections });
    ingest(ctx, { input, idempotencyKey: "one" });
    const first = ctx.fns.bot.processInbox();
    await started;
    try {
        await expect(ctx.fns.bot.processInbox()).rejects.toThrow("already running");
    } finally { release(); }
    expect((await first).processed).toBe(1);
    expect(calls).toBe(1);
    expect((await ctx.fns.bot.processInbox()).processed).toBe(0);
});

test("first drain recovers interrupted rows; failed writes roll back and retry", async () => {
    const ctx = await testCtx();
    ctx.fns.bot.save({ definition: { id: "a", start_node_id: "message", nodes: [{ id: "message", type: "message", text: "hello" }] }, connections });
    ingest(ctx, { input, idempotencyKey: "recover" });
    // Persisted state left by a dead process, before this runtime's first drain.
    ctx.fns.procs.db.run({ sql: "UPDATE bot_inbox_events SET status = 'processing', attempts = 1" });
    ctx.fns.procs.db.exec({ sql: "CREATE TRIGGER reject_output BEFORE INSERT ON bot_outbox_messages BEGIN SELECT RAISE(ABORT, 'send storage failed'); END" });
    expect((await ctx.fns.bot.processInbox()).failed).toBe(1);
    expect(ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_sessions" })).toEqual([]);
    expect(ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_events" })).toEqual([]);
    expect(ctx.fns.bot.pending()).toEqual([]);
    const failed = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_inbox_events" })[0];
    expect(failed.status).toBe("failed");
    expect(failed.attempts).toBe(2);
    expect(failed.last_error).toContain("send storage failed");
    expect(failed.next_retry_at).toBeTruthy();
    ctx.fns.procs.db.exec({ sql: "DROP TRIGGER reject_output; UPDATE bot_inbox_events SET next_retry_at = NULL" });
    expect((await ctx.fns.bot.processInbox()).processed).toBe(1);
    expect(ctx.fns.bot.pending()).toHaveLength(1);
    expect((await ctx.fns.bot.processInbox()).processed).toBe(0);
});

test("cross-flow jump continues the new flow; notify_only preserves the old flow", async () => {
    const ctx = await testCtx();
    ctx.fns.bot.save({ definition, connections });
    ctx.fns.bot.save({ definition: { ...definition, id: "b", version: 2, start_node_id: "other", nodes: [{ id: "other", type: "input", input_key: "reply", next: "finish" }, { id: "finish", type: "end" }] }, connections });
    ingest(ctx, { input, idempotencyKey: "start" });
    await ctx.fns.bot.processInbox();
    ingest(ctx, { input: { ...input, flow_slug: "b", session_mode: "notify_only" }, idempotencyKey: "notify" });
    await ctx.fns.bot.processInbox();
    const preserved = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_sessions" })[0];
    expect(preserved.flow_id).toBe("a");
    expect(preserved.current_node_id).toBe("wait");
    expect(preserved.flow_version).toBe(1);
    ingest(ctx, { input: { ...input, flow_slug: "b", session_mode: "start_or_jump" }, idempotencyKey: "jump" });
    await ctx.fns.bot.processInbox();
    expect(ctx.fns.procs.db.select({ sql: "SELECT flow_id FROM bot_sessions" })[0].flow_id).toBe("b");
    ingest(ctx, { input: { channel: "echo", external_id: "1", kind: "user_message", text: "answer" }, idempotencyKey: "reply" });
    expect((await ctx.fns.bot.processInbox()).failed).toBe(0);
    const finished = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_sessions" })[0];
    expect(finished.completed_at).toBeTruthy();
    expect(JSON.parse(finished.context).reply).toBe("answer");
});
