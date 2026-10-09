// Cache Telegram file ids for local uploads so the next send does not re-upload.
export default function (ctx: Context, _session: Session | null, opts: { connectionId: number; payload: any; refs: string[] }) {
    const photos = (opts.payload?.attachments ?? []).filter((photo: any) => photo?.type === "photo" && typeof photo.url === "string" && photo.url.startsWith("/uploads/bot/"));
    photos.forEach((photo: any, index: number) => {
        const ref = opts.refs[index];
        if (!ref) return;
        ctx.fns.procs.db.run({
            sql: `INSERT INTO bot_media_uploads (media_key, bot_channel_connection_id, remote_ref) VALUES (?, ?, ?)
                  ON CONFLICT(media_key, bot_channel_connection_id) DO UPDATE SET remote_ref = excluded.remote_ref`,
            params: [photo.url, opts.connectionId, ref],
        });
    });
    return { ok: true };
}
