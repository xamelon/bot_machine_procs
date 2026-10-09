import { test, expect } from "bun:test";
import { testCtx } from "../$test";

const ctx = await testCtx();

const flow = {
    id: "demo",
    start_node_id: "welcome",
    nodes: [
        { id: "welcome", type: "message", text: "Hello {{name}}", buttons: [{ label: "Go", payload: "go", to: "ask" }] },
        { id: "ask", type: "input", prompt: "Name?", input_key: "name", next: "check" },
        { id: "check", type: "condition", branches: [{ when: { op: "equals", path: "name", value: "ada" }, to: "done" }], default: "welcome" },
        { id: "done", type: "end" },
    ],
};

test("render and validate", () => {
    expect(ctx.fns.bot.render({ template: "Hi {{name}}", context: { name: "ada" } })).toBe("Hi ada");
    expect(ctx.fns.bot.validate({ flow, actions: [] })).toEqual([]);
    expect(ctx.fns.bot.validate({ flow: { nodes: [] }, actions: [] }).map((i) => i.path)).toEqual(["id", "start_node_id"]);
});

test("match prefers a concrete channel at the same priority", () => {
    const input = { kind: "user_message", channel: "echo", text: "/start" };
    const triggers = [
        { enabled: true, channel: "*", type: "command", match: { command: "start" }, priority: 1, start_node_id: "any" },
        { enabled: true, channel: "echo", type: "command", match: { command: "start" }, priority: 1, start_node_id: "echo" },
    ];
    expect(ctx.fns.bot.match({ input, triggers }).start_node_id).toBe("echo");
});

test("run waits on a button, then stores input", async () => {
    const first = await ctx.fns.bot.run({
        flow,
        input: { channel: "echo", external_id: "1", kind: "user_message", text: "/start" },
        trigger: { start_node_id: "welcome", session_mode: "restart" },
    });
    expect(first.outputs[0].text).toBe("Hello ");
    expect(first.session.currentNodeId).toBe("welcome");

    const clicked = await ctx.fns.bot.run({ flow, input: { channel: "echo", external_id: "1", kind: "user_message", payload: "go" }, session: first.session });
    expect(clicked.outputs.map((o: any) => o.text)).toEqual(["Name?"]);
    expect(clicked.session.currentNodeId).toBe("ask");

    const named = await ctx.fns.bot.run({ flow, input: { channel: "echo", external_id: "1", kind: "user_message", text: "ada" }, session: clicked.session });
    expect(named.session.completed).toBe(true);
    expect(named.session.context.name).toBe("ada");
});

test("processInbox writes the outbox and continues the session", async () => {
    ctx.fns.bot.save({
        definition: flow,
        connections: ["conn_echo"],
        triggers: [{ name: "start", channel: "echo", type: "command", match: { command: "start" }, start_node_id: "welcome", session_mode: "restart" }],
    });
    const connectionId = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = 'conn_echo'" })[0].id;
    const input = { channel: "echo", external_id: "9", kind: "user_message", text: "/start" };
    expect(ctx.fns.bot.ingest({ input, connectionId, idempotencyKey: "k1" }).inserted).toBe(true);
    expect(ctx.fns.bot.ingest({ input, connectionId, idempotencyKey: "k1" }).inserted).toBe(false);
    expect(await ctx.fns.bot.processInbox({})).toEqual({ processed: 1, failed: 0, more: false });
    const pending = ctx.fns.bot.pending({});
    expect(pending.map((row: any) => row.payload.text)).toEqual(["Hello "]);
    ctx.fns.bot.ack({ id: pending[0].id, externalMessageId: "m1" });
    expect(ctx.fns.bot.pending({})).toEqual([]);

    ctx.fns.bot.ingest({ input: { channel: "echo", external_id: "9", kind: "user_message", payload: "go" }, connectionId, idempotencyKey: "k2" });
    await ctx.fns.bot.processInbox({});
    ctx.fns.bot.ingest({ input: { channel: "echo", external_id: "9", kind: "user_message", text: "ada" }, connectionId, idempotencyKey: "k3" });
    await ctx.fns.bot.processInbox({});
    const session = ctx.fns.procs.db.select({ sql: "SELECT context FROM bot_sessions WHERE completed_at IS NOT NULL ORDER BY id DESC LIMIT 1" })[0];
    expect(JSON.parse(session.context).name).toBe("ada");
});

test("action hook is the registry", async () => {
    ctx.fns.procs.hooks.register({
        name: "bot.action.remember",
        id: "test",
        fn: (_ctx: Context, _session: Session | null, opts: any) => ({ context: { ...opts.session.context, remembered: opts.params.tag } }),
    });
    const actionFlow = {
        id: "act", start_node_id: "a",
        nodes: [
            { id: "a", type: "action", action: "remember", params: { tag: "x" }, next: "e" },
            { id: "e", type: "end" },
        ],
    };
    expect(ctx.fns.bot.validate({ flow: actionFlow })).toEqual([]);
    const result = await ctx.fns.bot.run({
        flow: actionFlow,
        input: { channel: "echo", external_id: "1" },
        trigger: { start_node_id: "a", session_mode: "restart" },
    });
    expect(result.session.context.remembered).toBe("x");
    expect(result.session.completed).toBe(true);
});
