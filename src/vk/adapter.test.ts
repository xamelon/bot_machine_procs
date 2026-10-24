import { test, expect } from "bun:test";
import { testCtx } from "../$test";
import adapter from "./$hook_bot.adapter.vk";
import webhook from "../bot/$route_webhook_$channel_$publicId_POST";

const ctx = await testCtx();
const event = { type: "message_new", group_id: 1, event_id: "vk-regression", object: { message: { from_id: 5, text: "hello" } } };

test("VK requires the configured secret for messages and confirmation", async () => {
    const saved = ctx.fns.bot.saveConnection({ channel: "vk", name: "VK secret", publicId: "vk-secret-regression", credentials: { callback_secret: "expected", confirmation_code: "confirm" } });
    const connection = { id: saved.id, credentials: { callback_secret: "expected", confirmation_code: "confirm" } };
    for (const type of ["message_new", "confirmation"]) {
        for (const secret of [undefined, "", "wrong"]) {
            const parsed = await adapter(ctx, null, { phase: "parse", connection, body: { ...event, type, secret } });
            expect(parsed.input).toBeUndefined();
            expect(parsed.response).toBeUndefined();
        }
    }
    const row = ctx.fns.procs.db.select({ sql: "SELECT credentials FROM bot_channel_connections WHERE id = ?", params: [saved.id] })[0];
    expect(JSON.parse(row.credentials).confirmation_received_at).toBeUndefined();
    expect((await adapter(ctx, null, { phase: "parse", connection, body: { ...event, secret: "expected" } })).input).toBeTruthy();
    const confirmed = await adapter(ctx, null, { phase: "parse", connection, body: { type: "confirmation", secret: "expected" } });
    expect(await confirmed.response.text()).toBe("confirm");
    expect((await adapter(ctx, null, { phase: "parse", connection: { credentials: {} }, body: event })).input).toBeTruthy();
});

test("VK webhook acknowledges ingestion and duplicates with plain ok", async () => {
    ctx.fns.bot.saveConnection({ channel: "vk", name: "VK webhook", publicId: "vk-webhook-regression", credentials: { callback_secret: "expected" } });
    const body = { ...event, secret: "expected" };
    for (let i = 0; i < 2; i++) {
        const response = await ctx.fns.procs.http.dispatch({ method: "POST", url: "/bot/webhook/vk/vk-webhook-regression", body });
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/plain");
        expect(await response.text()).toBe("ok");
    }
    expect(ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_inbox_events WHERE idempotency_key = ?", params: ["vk:1:vk-regression"] })).toHaveLength(1);
});

test("VK webhook does not acknowledge failed ingestion", async () => {
    const fakeCtx: any = { fns: {
        procs: { db: { select: () => [{ channel: "vk", credentials: "{}", config: "{}" }] }, hooks: { first: () => ({ input: {}, webhookResponse: new Response("ok") }) } },
        bot: { ingest: () => { throw new Error("ingestion failed"); } },
    } };
    await expect(webhook(fakeCtx, null, { req: new Request("https://bot.example", { method: "POST", body: "{}" }), params: { channel: "vk", publicId: "test" } })).rejects.toThrow("ingestion failed");
});

test("VK random_id identifies the outbox row, not its content or prepared media", async () => {
    const ids: string[] = [];
    const fakeCtx: any = { fns: { bot: {
        formatMessage: ({ text }: any) => ({ text }),
        platformFetch: async ({ init }: any) => {
            ids.push(new URLSearchParams(init.body).get("random_id")!);
            return { response: Response.json({ response: 123 }) };
        },
    } } };
    const connection = { credentials: { group_access_token: "test" } };
    const payload = { external_id: "5", text: "same" };
    for (const message of [{ id: 1, payload }, { id: 2, payload }, { id: 1, payload: { ...payload, attachments: [{ type: "photo", ref: "photo1_2" }] } }]) {
        expect(await adapter(fakeCtx, null, { phase: "send", connection, message })).toMatchObject({ ok: true });
    }
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[0]).toBe(ids[2]);
});
