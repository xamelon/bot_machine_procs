// Turn local editor uploads into something the channel can send, and remember the remote ref.
export default async function (ctx: Context, _session: Session | null, opts: { connection: any; payload: any }) {
    const payload = opts.payload ?? {};
    const attachments = [];
    for (const photo of payload.attachments ?? []) attachments.push(await prepare(ctx, opts.connection, payload, photo));
    return { ...payload, attachments };
}

async function prepare(ctx: Context, connection: any, payload: any, photo: any) {
    if (photo?.type !== "photo" || !local(photo.url) || photo.ref) return photo;
    const cached = ctx.fns.procs.db.select({
        sql: "SELECT remote_ref FROM bot_media_uploads WHERE bot_channel_connection_id = ? AND media_key = ?",
        params: [connection.id, photo.url],
    })[0]?.remote_ref;
    if (cached) return { ...photo, ref: cached };
    if (connection.channel === "vk") {
        const uploaded = await ctx.fns.procs.hooks.first({
            name: "bot.adapter.vk",
            opts: { phase: "preparePhoto", connection, path: disk(ctx, photo.url), peerId: payload.external_id },
        });
        if (!uploaded?.ref) throw new Error(uploaded?.error ?? "VK photo upload failed");
        put(ctx, connection.id, photo.url, uploaded.ref);
        return { ...photo, ref: uploaded.ref };
    }
    if (connection.channel === "telegram") {
        const base = ctx.fns.procs.config.resolve({ module: "bot" }).publicBaseUrl.replace(/\/$/, "");
        if (!base) throw new Error("PUBLIC_BASE_URL is required for media delivery");
        return { ...photo, url: base + photo.url };
    }
    return photo;
}

function put(ctx: Context, connectionId: number, key: string, ref: string) {
    ctx.fns.procs.db.run({
        sql: `INSERT INTO bot_media_uploads (media_key, bot_channel_connection_id, remote_ref) VALUES (?, ?, ?)
              ON CONFLICT(media_key, bot_channel_connection_id) DO UPDATE SET remote_ref = excluded.remote_ref`,
        params: [key, connectionId, ref],
    });
}

function local(url: unknown) {
    return typeof url === "string" && url.startsWith("/uploads/bot/");
}

function disk(ctx: Context, url: string) {
    return `${ctx.fns.procs.project.runtimeDir({})}/uploads/bot/${url.slice("/uploads/bot/".length).replace(/[^a-zA-Z0-9._-]/g, "")}`;
}
