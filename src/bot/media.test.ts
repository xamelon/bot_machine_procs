import { test, expect } from "bun:test";
import { testCtx } from "../$test";

test("editor upload is served from /uploads/bot and reused as a channel ref", async () => {
    const ctx = await testCtx({ env: { PUBLIC_BASE_URL: "https://bot.example" } });
    const png = new File([Uint8Array.from([137, 80, 78, 71])], "a.png", { type: "image/png" });
    const saved = await ctx.fns.bot.saveMedia({ file: png });
    expect(saved.url).toStartWith("/uploads/bot/media_");
    const served = await ctx.fns.procs.http.dispatch({ url: saved.url });
    expect(served.status).toBe(200);

    const echo = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = 'conn_echo'" })[0];
    const connection = { id: echo.id, channel: "telegram", credentials: {} };
    ctx.fns.procs.db.insert({ into: "bot_media_uploads", values: { media_key: saved.url, bot_channel_connection_id: echo.id, remote_ref: "file-cached" } });
    const prepared = await ctx.fns.bot.prepareMedia({ connection, payload: { attachments: [{ type: "photo", url: saved.url }] } });
    expect(prepared.attachments[0].ref).toBe("file-cached");

    ctx.fns.procs.db.run({ sql: "DELETE FROM bot_media_uploads" });
    const absolute = await ctx.fns.bot.prepareMedia({ connection, payload: { external_id: "1", attachments: [{ type: "photo", url: saved.url }] } });
    expect(absolute.attachments[0].url).toBe(`https://bot.example${saved.url}`);
    await expect(ctx.fns.bot.saveMedia({ file: new File(["x"], "a.txt", { type: "text/plain" }) })).rejects.toThrow("only JPEG");
});
