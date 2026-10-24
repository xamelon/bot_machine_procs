import { test, expect } from "bun:test";
import { testCtx } from "../$test";
import webhook from "../bot/$route_webhook_$channel_$publicId_POST";

const ctx = await testCtx({ env: { PUBLIC_BASE_URL: "https://bot.example" } });
const credentials = { bot_token: "test-token", webhook_secret: "test-secret" };
const first = ctx.fns.bot.saveConnection({ channel: "telegram", name: "First", publicId: "secure-tg-1", credentials });
const second = ctx.fns.bot.saveConnection({ channel: "telegram", name: "Second", publicId: "secure-tg-2", credentials });
const headers = { "x-telegram-bot-api-secret-token": credentials.webhook_secret };
const message = (update_id: number, type = "private") => ({ update_id, message: { chat: { id: 42, type }, from: { id: 42 }, text: "/start" } });
const dispatch = (url: string, body: any, supplied: Record<string, string> = headers) => ctx.fns.procs.http.dispatch({ method: "POST", url, body, headers: supplied });
const inbox = () => ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_inbox_events WHERE channel = 'telegram'" });
const parse = (body: any, connection: any = { id: first.id, credentials }) => ctx.fns.procs.hooks.first({ name: "bot.adapter.telegram", opts: { phase: "parse", body, connection, req: new Request("https://bot.example/webhook", { headers }) } });
const send = (payload: any) => ctx.fns.procs.hooks.first({ name: "bot.adapter.telegram", opts: { phase: "send", connection: { credentials }, message: { payload: { external_id: "42", ...payload } } } });

test("both Telegram webhook routes reject missing and incorrect secrets without queueing", async () => {
    const before = inbox().length;
    const suppliedHeaders: Record<string, string>[] = [{}, { "x-telegram-bot-api-secret-token": "wrong" }, { "x-telegram-bot-api-secret-token": "x".repeat(11) }];
    for (const url of ["/bot/webhook/telegram", "/bot/webhook/telegram/secure-tg-1"]) {
        for (const supplied of suppliedHeaders) {
            expect((await dispatch(url, message(100), supplied)).status).toBe(403);
        }
    }
    expect(inbox().length).toBe(before);
    const unconfigured = await parse(message(100), { id: first.id, credentials: { bot_token: "t" } });
    expect(unconfigured.response.status).toBe(403);
});

test("deduplication is scoped to the connection, also on the legacy route", async () => {
    for (const url of ["/bot/webhook/telegram", "/bot/webhook/telegram/secure-tg-2"]) {
        const res = await dispatch(url, message(101));
        expect(res.status).toBe(202);
        expect(await res.json()).toEqual({ ok: true, queued: true });
        expect(await (await dispatch(url, message(101))).json()).toEqual({ ok: true, queued: false });
    }
    expect(inbox().filter((row: any) => [first.id, second.id].includes(row.bot_channel_connection_id) && JSON.parse(row.payload).text === "/start").length).toBe(2);
});

test("callbacks are queued and acknowledged through the webhook response, including duplicates", async () => {
    const body = { update_id: 102, callback_query: { id: "query-102", from: { id: 42 }, data: '{"p":"nav:menu"}', message: { chat: { id: 42, type: "private" } } } };
    for (let attempt = 0; attempt < 2; attempt++) {
        const res = await dispatch("/bot/webhook/telegram/secure-tg-1", body);
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("application/json");
        expect(await res.json()).toEqual({ method: "answerCallbackQuery", callback_query_id: "query-102" });
    }
    const rows = inbox().filter((row: any) => row.idempotency_key === `telegram:${first.id}:102`);
    expect(rows.length).toBe(1);
    expect(JSON.parse(rows[0].payload).payload).toBe("nav:menu");
});

test("a failed ingest does not acknowledge a callback", async () => {
    const fakeCtx = { fns: { procs: { db: { select: () => [{ channel: "telegram" }] }, hooks: { first: async () => ({ input: {}, webhookReply: { method: "answerCallbackQuery" } }) } }, bot: { ingest: () => { throw new Error("database unavailable"); } } } };
    await expect(webhook(fakeCtx as any, null, { req: new Request("https://bot.example", { method: "POST", body: "{}" }), params: { channel: "telegram", publicId: "test" } })).rejects.toThrow("database unavailable");
});

test("incoming photos keep a reusable file_id, never a token-bearing URL, without API calls", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error("parse must not access Telegram"); }) as any;
    try {
        const body = message(103);
        (body.message as any).photo = [{ file_id: "small", file_size: 1 }, { file_id: "large", file_size: 100 }];
        expect((await dispatch("/bot/webhook/telegram/secure-tg-1", body)).status).toBe(202);
        const row = inbox().find((row: any) => row.idempotency_key === `telegram:${first.id}:103`);
        const input = JSON.parse(row.payload);
        expect(input.attachments).toEqual([{ type: "photo", ref: "large" }]);
        expect(row.payload).not.toContain(credentials.bot_token);
        const received = await ctx.fns.bot.receive({ input, session: { context: {} }, node: { type: "input", input_type: "photo", input_key: "picture", next: "done" } });
        expect(received).toMatchObject({ context: { picture: "large" } });
    } finally { globalThis.fetch = original; }
});

test("groups and invalid updates cannot create personal sessions", async () => {
    for (const type of ["group", "supergroup", "channel"]) expect((await parse(message(104, type))).input).toBeUndefined();
    const callback = { update_id: 104, callback_query: { id: "q", data: "go", message: { chat: { id: -42, type: "group" } } } };
    expect((await parse(callback)).input).toBeUndefined();
    for (const update_id of [undefined, "104", -1, 1.5]) expect((await parse({ ...message(104), update_id })).response.status).toBe(400);
});

test("provision installs a random secret, persists it and reuses it", async () => {
    const connection = ctx.fns.bot.saveConnection({ channel: "telegram", name: "Provision", publicId: "secure-tg-provision", credentials: { bot_token: "t" } });
    const secrets: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
        if (String(url).endsWith("/setWebhook")) {
            const body = JSON.parse(init.body);
            secrets.push(body.secret_token);
            expect(body.allowed_updates).toEqual(["message", "callback_query"]);
        }
        return Response.json({ ok: true, result: String(url).endsWith("/getMe") ? { id: 7, username: "test_bot" } : true });
    }) as any;
    try {
        for (let i = 0; i < 2; i++) expect(await ctx.fns.bot.provision({ publicId: "secure-tg-provision" })).toMatchObject({ ok: true });
    } finally { globalThis.fetch = original; }
    expect(secrets[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(secrets[1]).toBe(secrets[0]);
    const row = ctx.fns.procs.db.select({ sql: "SELECT credentials FROM bot_channel_connections WHERE id = ?", params: [connection.id] })[0];
    expect(JSON.parse(row.credentials).webhook_secret).toBe(secrets[0]);
});

test("invalid content is permanent before fetching; callback_data counts UTF-8 bytes", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => { calls++; return Response.json({ ok: true, result: { message_id: 1 } }); }) as any;
    try {
        for (const payload of [
            { text: "" },
            { text: "test", buttons_per_row: 0, buttons: [{ label: "A" }] },
            { text: "test", buttons: [{ label: "A", payload: "я".repeat(29) }] },
            { text: "test", attachments: [{ type: "photo", ref: "one" }, { type: "photo", ref: "two" }] },
            { text: "test", attachments: [{ type: "document", ref: "one" }] },
        ]) expect(await send(payload)).toMatchObject({ ok: false, permanent: true });
        expect(calls).toBe(0);
        expect(await send({ text: "test", buttons: [{ label: "A", payload: "я".repeat(28) }] })).toMatchObject({ ok: true });
        expect(calls).toBe(1);
    } finally { globalThis.fetch = original; }
});

test("Telegram 400 stops outbox retries without blocking the recipient", async () => {
    const now = new Date().toISOString();
    ctx.fns.procs.db.insert({ into: "bot_users", values: { bot_channel_connection_id: second.id, channel: "telegram", external_id: "400", metadata: "{}", created_at: now, updated_at: now } });
    const queued = ctx.fns.procs.db.insert({ into: "bot_outbox_messages", values: { bot_channel_connection_id: second.id, channel: "telegram", external_id: "400", idempotency_key: "tg-permanent-400", payload: JSON.stringify({ text: "<broken>", format: "html", external_id: "400" }), status: "pending", attempts: 0, created_at: now, updated_at: now } });
    const original = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({ ok: false, error_code: 400, description: "can't parse entities" }, { status: 400 })) as any;
    try { expect(await ctx.fns.bot.sendOutbox({ limit: 1 })).toMatchObject({ failed: 1, sent: 0 }); }
    finally { globalThis.fetch = original; }
    const row = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_outbox_messages WHERE id = ?", params: [queued.id] })[0];
    expect(row.status).toBe("dead");
    expect(row.next_retry_at).toBeNull();
    const user = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_users WHERE bot_channel_connection_id = ? AND external_id = '400'", params: [second.id] })[0];
    expect(user.blocked_at).toBeNull();
});
