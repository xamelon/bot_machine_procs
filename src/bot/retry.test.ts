import { test, expect } from "bun:test";
import { testCtx } from "../$test";

const ctx = await testCtx({ env: { PUBLIC_BASE_URL: "https://bot.example" } });
const db = ctx.fns.procs.db;
const hour = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

function stubFetch(answer: (url: string) => Response) {
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: any) => answer(String(url))) as any;
    return () => { globalThis.fetch = original; };
}

function queue(connectionId: number, channel: string, externalId: string, key: string, createdAt = iso(Date.now())) {
    db.run({ sql: "DELETE FROM bot_recipient_limits" });
    db.run({ sql: "DELETE FROM bot_platform_limits" });
    return Number(db.insert({ into: "bot_outbox_messages", values: {
        bot_channel_connection_id: connectionId, channel, external_id: externalId, idempotency_key: key, status: "pending", attempts: 0,
        payload: JSON.stringify({ channel, external_id: externalId, text: "hi" }), created_at: createdAt, updated_at: createdAt,
    } }).id);
}
const row = (id: number) => db.select({ sql: "SELECT * FROM bot_outbox_messages WHERE id = ?", params: [id] })[0];
const user = (connectionId: number, externalId: string) => db.select({ sql: "SELECT * FROM bot_users WHERE bot_channel_connection_id = ? AND external_id = ?", params: [connectionId, externalId] })[0];
function addUser(connectionId: number, channel: string, externalId: string) {
    const now = iso(Date.now());
    db.insert({ into: "bot_users", values: { bot_channel_connection_id: connectionId, channel, external_id: externalId, metadata: "{}", created_at: now, updated_at: now } });
}
// Seconds from now until the row's next attempt.
const wait = (at: string) => Math.round((Date.parse(at) - Date.now()) / 1000);

test("retries back off exponentially up to the cap, and give up after 24 hours", () => {
    const now = iso(Date.now());
    const delays = [1, 2, 3, 4, 9, 10, 30].map((attempts) => wait(ctx.fns.bot.retryAt({ attempts, createdAt: now }).at!));
    expect(delays).toEqual([5, 10, 20, 40, 1280, 1800, 1800]);
    // A platform hint or pause can push it later, never earlier.
    expect(wait(ctx.fns.bot.retryAt({ attempts: 1, createdAt: now, retryAfter: 60 }).at!)).toBe(60);
    expect(wait(ctx.fns.bot.retryAt({ attempts: 5, createdAt: now, retryAfter: 3 }).at!)).toBe(80);
    expect(wait(ctx.fns.bot.retryAt({ attempts: 1, createdAt: now, notBefore: Date.now() + 300_000 }).at!)).toBe(300);
    expect(ctx.fns.bot.retryAt({ attempts: 1, createdAt: iso(Date.now() - 23 * hour) }).dead).toBe(false);
    expect(ctx.fns.bot.retryAt({ attempts: 1, createdAt: iso(Date.now() - 24 * hour) })).toEqual({ dead: true, at: null });
});

test("a failing send waits longer each time, then is dead; Retry sends it again", async () => {
    const tg = ctx.fns.bot.saveConnection({ channel: "telegram", name: "TG retry", publicId: "tg-retry", credentials: { bot_token: "t" } });
    const restore = stubFetch(() => new Response(JSON.stringify({ ok: false, error_code: 500, description: "Internal Server Error" }), { status: 500 }));
    try {
        db.run({ sql: "DELETE FROM bot_outbox_messages" });
        const id = queue(tg.id, "telegram", "1", "r1");
        await ctx.fns.bot.sendOutbox({});
        expect(row(id)).toMatchObject({ status: "failed", attempts: 1 });
        expect(wait(row(id).next_retry_at)).toBe(5);
        db.run({ sql: "UPDATE bot_outbox_messages SET next_retry_at = NULL WHERE id = ?", params: [id] });
        db.run({ sql: "DELETE FROM bot_recipient_limits" });
        await ctx.fns.bot.sendOutbox({});
        expect(row(id)).toMatchObject({ status: "failed", attempts: 2 });
        expect(wait(row(id).next_retry_at)).toBe(10);

        const old = queue(tg.id, "telegram", "2", "r2", iso(Date.now() - 25 * hour));
        await ctx.fns.bot.sendOutbox({});
        expect(row(old)).toMatchObject({ status: "dead", attempts: 1, next_retry_at: null });
        expect(row(old).last_error).toContain("Telegram HTTP 500");
    } finally { restore(); }

    // Given up, so it is no longer picked up — until the operator retries it.
    const dead = db.select({ sql: "SELECT id FROM bot_outbox_messages WHERE status = 'dead'" })[0].id;
    expect(ctx.fns.bot.pending({}).some((m: any) => m.id === dead)).toBe(false);
    const res = await ctx.fns.procs.http.dispatch({ method: "POST", url: `/bot/outbox/${dead}/retry` });
    expect(res.status).toBe(303);
    expect(row(dead).status).toBe("pending");
    db.run({ sql: "DELETE FROM bot_recipient_limits" }); // the one-message-per-second pacing, not the retry
    expect(ctx.fns.bot.pending({}).some((m: any) => m.id === dead)).toBe(true);
});

test("Telegram 403 / chat not found, VK 900–902 and MAX 403 block the person, without retries", async () => {
    const tg = ctx.fns.bot.saveConnection({ channel: "telegram", name: "TG block", publicId: "tg-block", credentials: { bot_token: "t" } });
    const vk = ctx.fns.bot.saveConnection({ channel: "vk", name: "VK block", publicId: "vk-block", credentials: { group_access_token: "v" } });
    const max = ctx.fns.bot.saveConnection({ channel: "max", name: "MAX block", publicId: "max-block", credentials: { access_token: "m" } });
    const cases: { connection: any; channel: string; externalId: string; answer: any }[] = [
        { connection: tg, channel: "telegram", externalId: "10", answer: new Response(JSON.stringify({ ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" }), { status: 403 }) },
        { connection: tg, channel: "telegram", externalId: "11", answer: new Response(JSON.stringify({ ok: false, error_code: 400, description: "Bad Request: chat not found" }), { status: 400 }) },
        { connection: vk, channel: "vk", externalId: "12", answer: new Response(JSON.stringify({ error: { error_code: 901, error_msg: "Can't send messages for users without permission" } })) },
        { connection: max, channel: "max", externalId: "13", answer: new Response(JSON.stringify({ code: "chat.denied", message: "chat.denied" }), { status: 403 }) },
    ];
    for (const c of cases) {
        addUser(c.connection.id, c.channel, c.externalId);
        const restore = stubFetch(() => c.answer.clone());
        try {
            db.run({ sql: "DELETE FROM bot_outbox_messages" });
            const id = queue(c.connection.id, c.channel, c.externalId, `block-${c.externalId}`);
            await ctx.fns.bot.sendOutbox({});
            expect(row(id)).toMatchObject({ status: "dead", attempts: 1, next_retry_at: null });
            expect(user(c.connection.id, c.externalId).blocked_at).toBeTruthy();
        } finally { restore(); }
    }

    // A bad request that is not about the recipient is an ordinary retry, not a block.
    addUser(tg.id, "telegram", "14");
    const restore = stubFetch(() => new Response(JSON.stringify({ ok: false, error_code: 400, description: "Bad Request: can't parse entities" }), { status: 400 }));
    try {
        db.run({ sql: "DELETE FROM bot_outbox_messages" });
        const id = queue(tg.id, "telegram", "14", "parse-14");
        await ctx.fns.bot.sendOutbox({});
        expect(row(id).status).toBe("failed");
        expect(user(tg.id, "14").blocked_at).toBeNull();
    } finally { restore(); }

    // Writing again lifts the block.
    ctx.fns.bot.ingest({ connectionId: tg.id, idempotencyKey: "tg-back-10", input: { kind: "user_message", channel: "telegram", external_id: "10", text: "привет" } });
    await ctx.fns.bot.processInbox({});
    expect(user(tg.id, "10").blocked_at).toBeNull();
});

test("MAX bot_stopped blocks the person without running a flow; bot_started lifts it", async () => {
    const max = ctx.fns.bot.saveConnection({ channel: "max", name: "MAX stop", publicId: "max-stop", credentials: { access_token: "m" } });
    addUser(max.id, "max", "77");
    const stopped = await ctx.fns.procs.hooks.first({ name: "bot.adapter.max", opts: { phase: "parse", connection: {}, body: { update_type: "bot_stopped", timestamp: 5, chat_id: 77, user: { user_id: 9 } } } });
    expect(stopped).toEqual({ idempotencyKey: "max:5:stopped:77", input: { kind: "user_blocked", channel: "max", external_id: "77" } });
    ctx.fns.bot.ingest({ connectionId: max.id, idempotencyKey: stopped.idempotencyKey, input: stopped.input });
    const before = db.select({ sql: "SELECT count(*) n FROM bot_outbox_messages" })[0].n;
    await ctx.fns.bot.processInbox({});
    expect(user(max.id, "77").blocked_at).toBeTruthy();
    expect(db.select({ sql: "SELECT status FROM bot_inbox_events WHERE idempotency_key = ?", params: [stopped.idempotencyKey] })[0].status).toBe("processed");
    expect(db.select({ sql: "SELECT count(*) n FROM bot_outbox_messages" })[0].n).toBe(before);

    const started = await ctx.fns.procs.hooks.first({ name: "bot.adapter.max", opts: { phase: "parse", connection: {}, body: { update_type: "bot_started", timestamp: 6, chat_id: 77, user: { user_id: 9 } } } });
    ctx.fns.bot.ingest({ connectionId: max.id, idempotencyKey: started.idempotencyKey, input: started.input });
    await ctx.fns.bot.processInbox({});
    expect(user(max.id, "77").blocked_at).toBeNull();
});

test("a failing inbox event backs off too, and is dead after 24 hours", () => {
    const echo = db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = 'conn_echo'" })[0].id;
    const add = (key: string, createdAt: string) => Number(db.insert({ into: "bot_inbox_events", values: {
        bot_channel_connection_id: echo, channel: "echo", external_id: "x", idempotency_key: key, payload: "not json", status: "pending", attempts: 0, created_at: createdAt, updated_at: createdAt,
    } }).id);
    const fresh = add("bad-fresh", iso(Date.now()));
    const old = add("bad-old", iso(Date.now() - 25 * hour));
    return ctx.fns.bot.processInbox({}).then(() => {
        const get = (id: number) => db.select({ sql: "SELECT * FROM bot_inbox_events WHERE id = ?", params: [id] })[0];
        expect(get(fresh)).toMatchObject({ status: "failed", attempts: 1 });
        expect(wait(get(fresh).next_retry_at)).toBe(5);
        expect(get(old)).toMatchObject({ status: "dead", attempts: 1, next_retry_at: null });
    });
});
