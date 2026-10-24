import { test, expect } from "bun:test";
import { testCtx } from "../$test";

const ctx = await testCtx();
const send = (payload: any, attempts = 0) => ctx.fns.procs.hooks.first({ name: "bot.adapter.max", opts: {
    phase: "send", connection: { credentials: { access_token: "test-token" } }, message: { payload: { external_id: "42", ...payload }, attempts },
} });

test("MAX uploads a local photo once; outbox retries reuse the token and keep text/buttons", async () => {
    const saved = ctx.fns.bot.saveConnection({ channel: "max", name: "MAX photos", publicId: "max-photos", credentials: { access_token: "test-token" } });
    const media = await ctx.fns.bot.saveMedia({ file: new File([new Uint8Array([137, 80, 78, 71])], "a.png", { type: "image/png" }) });
    const payload = { external_id: "42", text: "**Фото**", attachments: [{ type: "photo", url: media.url }], buttons: [{ label: "Далее", payload: "next" }] };
    const now = new Date().toISOString();
    ctx.fns.procs.db.insert({ into: "bot_outbox_messages", values: {
        bot_channel_connection_id: saved.id, channel: "max", external_id: "42", idempotency_key: "max-photo-retry",
        payload: JSON.stringify(payload), status: "pending", attempts: 0, created_at: now, updated_at: now,
    } });
    const calls: string[] = [];
    let sends = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
        const target = new URL(String(url));
        calls.push(target.pathname);
        expect(init.tls.rejectUnauthorized).toBe(true);
        expect(init.headers.Authorization).toBe("test-token");
        if (target.pathname === "/uploads") {
            expect(target.searchParams.get("type")).toBe("image");
            expect(init.method).toBe("POST");
            return Response.json({ url: "https://iu.oneme.ru/uploadImage?signature=test" });
        }
        if (target.pathname === "/uploadImage") {
            expect(init.body).toBeInstanceOf(FormData);
            expect(init.body.get("data").size).toBe(4);
            expect(init.headers["content-type"]).toBeUndefined(); // fetch supplies the multipart boundary
            expect(init.redirect).toBe("error");
            return Response.json({ photos: { "123": { token: "image-token" } } });
        }
        expect(target.pathname).toBe("/messages");
        expect(JSON.parse(init.body)).toMatchObject({ text: "**Фото**", format: "markdown", attachments: [
            { type: "image", payload: { token: "image-token" } },
            { type: "inline_keyboard", payload: { buttons: [[{ type: "callback", text: "Далее", payload: "next" }]] } },
        ] });
        sends++;
        return sends === 1 ? Response.json({ code: "attachment.not.ready" }, { status: 400 }) : Response.json({ message: { body: { mid: "photo-message" } } });
    }) as typeof fetch;
    try {
        expect(await ctx.fns.bot.sendOutbox({})).toMatchObject({ sent: 0, failed: 1 });
        const row = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_outbox_messages WHERE idempotency_key = 'max-photo-retry'" })[0];
        expect(row.attempts).toBe(1);
        expect(Date.parse(row.next_retry_at) - Date.now()).toBeGreaterThan(3000);
        expect(ctx.fns.procs.db.select({ sql: "SELECT remote_ref FROM bot_media_uploads WHERE bot_channel_connection_id = ?", params: [saved.id] })[0].remote_ref).toBe("image-token");
        ctx.fns.procs.db.run({ sql: "UPDATE bot_outbox_messages SET next_retry_at = ? WHERE id = ?", params: [now, row.id] });
        ctx.fns.procs.db.run({ sql: "UPDATE bot_recipient_limits SET next_send_at = 0 WHERE channel = 'max' AND external_id = '42'" });
        expect(await ctx.fns.bot.sendOutbox({})).toMatchObject({ sent: 1, failed: 0 });
        expect(calls).toEqual(["/uploads", "/uploadImage", "/messages", "/messages"]);
        const sent = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_outbox_messages WHERE id = ?", params: [row.id] })[0];
        expect(sent.status).toBe("sent");
        expect(JSON.parse(sent.payload)).toEqual(payload); // the source is never rewritten
    } finally { globalThis.fetch = original; }
});

test("MAX sends external URLs and refs together, preserves native attachments", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: any, init: any) => {
        expect(JSON.parse(init.body).attachments).toEqual([
            { type: "image", payload: { url: "https://example.org/a.png" } },
            { type: "image", payload: { token: "cached" } },
            { type: "image", payload: { token: "native" } },
        ]);
        return Response.json({ message: { body: { mid: "m" } } });
    }) as typeof fetch;
    try {
        expect((await send({ attachments: [
            { type: "photo", url: "https://example.org/a.png" },
            { type: "photo", ref: "cached", url: "/uploads/bot/unused.png" },
            { type: "image", payload: { token: "native" } },
        ] })).ok).toBe(true);
    } finally { globalThis.fetch = original; }
});

test("MAX does not silently drop unprepared photos or excess images", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error("must not fetch"); }) as typeof fetch;
    try {
        expect((await send({ attachments: [{ type: "photo", url: "/uploads/bot/local.png" }] })).error).toContain("uploaded token");
        expect((await send({ attachments: Array.from({ length: 13 }, () => ({ type: "photo", ref: "r" })) })).error).toContain("12 images");
    } finally { globalThis.fetch = original; }
});

test("MAX attachment processing retries back off", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({ code: "attachment.not.ready" }, { status: 400 })) as typeof fetch;
    try {
        expect((await send({ attachments: [{ type: "photo", ref: "processing" }] }, 2)).retryAfter).toBe(20);
    } finally { globalThis.fetch = original; }
});

test("MAX upload failures propagate without caching or leaking signed URLs", async () => {
    const media = await ctx.fns.bot.saveMedia({ file: new File(["png"], "b.png", { type: "image/png" }) });
    const saved = ctx.fns.bot.saveConnection({ channel: "max", name: "MAX failures", publicId: "max-photo-failures", credentials: { access_token: "test-token" } });
    const connection = { id: saved.id, channel: "max", credentials: { access_token: "test-token" } };
    const prepare = () => ctx.fns.bot.prepareMedia({ connection, payload: { attachments: [{ type: "photo", url: media.url }] } });
    const original = globalThis.fetch;
    let mode = "url-error";
    globalThis.fetch = (async (url: any) => {
        if (String(url).includes("/uploads?")) {
            if (mode === "url-error") return Response.json({}, { status: 503 });
            if (mode === "untrusted") return Response.json({ url: "https://untrusted.example/upload?secret=hidden" });
            return Response.json({ url: "https://iu.oneme.ru/uploadImage?secret=hidden" });
        }
        if (mode === "upload-error") return Response.json({}, { status: 503 });
        if (mode === "network") throw new Error("fetch failed https://iu.oneme.ru/?secret=hidden");
        if (mode === "limited") return Response.json({}, { status: 429, headers: { "retry-after": "7" } });
        return Response.json({ photos: {} });
    }) as typeof fetch;
    try {
        await expect(prepare()).rejects.toThrow("upload URL HTTP 503");
        mode = "untrusted";
        await expect(prepare()).rejects.toThrow("unexpected upload host");
        mode = "upload-error";
        await expect(prepare()).rejects.toThrow("image upload HTTP 503");
        mode = "network";
        await expect(prepare()).rejects.toThrow("MAX image upload failed");
        mode = "empty";
        await expect(prepare()).rejects.toThrow("returned no token");
        mode = "limited";
        try { await prepare(); throw new Error("expected failure"); } catch (error: any) {
            expect(error.message).toBe("MAX image upload HTTP 429");
            expect(error.retryAfter).toBe(7);
        }
        expect(ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_media_uploads WHERE bot_channel_connection_id = ?", params: [saved.id] })).toHaveLength(0);
    } finally { globalThis.fetch = original; }
});
