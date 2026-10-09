import { test, expect } from "bun:test";
import { testCtx } from "../$test";

const ctx = await testCtx({ env: { PUBLIC_BASE_URL: "https://bot.example" } });
const echoId = () => ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = 'conn_echo'" })[0].id;

test("echo webhook queues normalized input", async () => {
    const res = await ctx.fns.procs.http.dispatch({ method: "POST", url: "/bot/webhook/echo", body: { external_id: "u1", text: "/start abc", idempotency_key: "e1" } });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true, queued: true });
    const row = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_inbox_events WHERE idempotency_key = 'e1'" })[0];
    expect(JSON.parse(row.payload)).toMatchObject({ channel: "echo", external_id: "u1", text: "/start abc", start_param: "abc" });
});

test("telegram parses messages and callback payloads", async () => {
    const message = await ctx.fns.procs.hooks.first({ name: "bot.adapter.telegram", opts: { phase: "parse", body: { update_id: 7, message: { chat: { id: 42 }, text: "hi", from: { id: 9, first_name: "Ada", username: "ada" }, photo: [{ file_id: "small", file_size: 1 }, { file_id: "big", file_size: 9 }] } } } });
    expect(message.idempotencyKey).toBe("telegram:7");
    expect(message.input).toMatchObject({ channel: "telegram", external_id: "42", text: "hi", display_name: "Ada", attachments: [{ type: "photo", ref: "big" }] });

    const callback = await ctx.fns.procs.hooks.first({ name: "bot.adapter.telegram", opts: { phase: "parse", body: { update_id: 8, callback_query: { data: JSON.stringify({ p: "go" }), message: { chat: { id: 42 } } } } } });
    expect(callback.input).toMatchObject({ payload: "go", text: JSON.stringify({ p: "go" }) });
});

test("vk confirmation and message parsing", async () => {
    const saved = ctx.fns.bot.saveConnection({ channel: "vk", name: "VK", publicId: "vk1", credentials: { confirmation_code: "confirm", group_access_token: "v", group_id: "1" } });
    const connection = { id: saved.id, public_id: "vk1", credentials: { confirmation_code: "confirm" } };
    const confirm = await ctx.fns.procs.hooks.first({ name: "bot.adapter.vk", opts: { phase: "parse", body: { type: "confirmation" }, connection } });
    expect(await confirm.response.text()).toBe("confirm");
    expect(JSON.parse(ctx.fns.procs.db.select({ sql: "SELECT credentials FROM bot_channel_connections WHERE public_id = 'vk1'" })[0].credentials).confirmation_received_at).toBeTruthy();
    const parsed = await ctx.fns.procs.hooks.first({
        name: "bot.adapter.vk",
        opts: {
            phase: "parse",
            body: {
                type: "message_new",
                group_id: 1,
                event_id: "x",
                object: {
                    message: {
                        from_id: 5,
                        text: "/start q",
                        payload: JSON.stringify({ p: "go" }),
                        attachments: [{ type: "photo", photo: { owner_id: 1, id: 2, sizes: [{ width: 1, height: 1, url: "small" }, { width: 2, height: 2, url: "big" }] } }],
                    },
                },
            },
        },
    });
    expect(parsed.idempotencyKey).toBe("vk:1:x");
    expect(parsed.input).toMatchObject({ channel: "vk", external_id: "5", payload: "go", start_param: "q", attachments: [{ type: "photo", ref: "photo1_2", url: "big" }] });
});

test("sendOutbox uses adapter and ack", async () => {
    ctx.fns.procs.db.run({ sql: "DELETE FROM bot_outbox_messages" });
    ctx.fns.procs.db.insert({ into: "bot_outbox_messages", values: { bot_channel_connection_id: echoId(), channel: "echo", external_id: "u", idempotency_key: "o1", payload: JSON.stringify({ channel: "echo", external_id: "u", text: "hi" }), status: "pending", attempts: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } });
    expect(await ctx.fns.bot.sendOutbox({})).toEqual({ sent: 1, failed: 0, skipped: 0 });
    expect(ctx.fns.procs.db.select({ sql: "SELECT status FROM bot_outbox_messages WHERE idempotency_key = 'o1'" })[0].status).toBe("sent");
});

test("telegram provision stores getMe and webhook", async () => {
    const saved = ctx.fns.bot.saveConnection({ channel: "telegram", name: "TG", publicId: "tg1", credentials: { bot_token: "t" } });
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: any) => {
        const path = String(url);
        const body = path.endsWith("/getMe") ? { ok: true, result: { id: 7, username: "demo_bot", first_name: "Demo" } } : { ok: true, result: true };
        return new Response(JSON.stringify(body), { status: 200 });
    }) as any;
    try {
        expect(await ctx.fns.bot.provision({ publicId: "tg1", waitMs: 0 })).toMatchObject({ ok: true });
    } finally { globalThis.fetch = original; }
    const row = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_channel_connections WHERE id = ?", params: [saved.id] })[0];
    expect(row.external_id).toBe("demo_bot");
    expect(JSON.parse(row.config).webhook_url).toBe("https://bot.example/bot/webhook/telegram/tg1");
});

test("vk send uploads a photo url before messages.send", async () => {
    const saved = ctx.fns.bot.saveConnection({ channel: "vk", name: "VK send", publicId: "vk-send", credentials: { group_access_token: "v" } });
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
        const path = String(url);
        calls.push(path);
        if (path.startsWith("https://img")) return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/jpeg" } });
        if (path.includes("getMessagesUploadServer")) return new Response(JSON.stringify({ response: { upload_url: "https://upload" } }));
        if (path.startsWith("https://upload")) return new Response(JSON.stringify({ server: 1, photo: "[]", hash: "h" }));
        if (path.includes("saveMessagesPhoto")) return new Response(JSON.stringify({ response: [{ owner_id: 1, id: 9 }] }));
        expect(new URLSearchParams(init?.body).get("attachment")).toBe("photo1_9");
        return new Response(JSON.stringify({ response: 44 }));
    }) as any;
    try {
        const result = await ctx.fns.procs.hooks.first({
            name: "bot.adapter.vk",
            opts: { phase: "send", connection: { id: saved.id, credentials: { group_access_token: "v" } }, message: { payload: { external_id: "5", text: "pic", attachments: [{ type: "photo", url: "https://img/a.jpg" }] } } },
        });
        expect(result).toEqual({ ok: true, externalMessageId: "44" });
    } finally { globalThis.fetch = original; }
    expect(calls.some((url) => url.includes("messages.send"))).toBe(true);
});
