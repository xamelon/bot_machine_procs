export default {
    up(ctx: Context) {
        ctx.fns.procs.db.exec({ sql: `
            CREATE TABLE IF NOT EXISTS bot_media_uploads (
                media_key TEXT NOT NULL,
                bot_channel_connection_id INTEGER NOT NULL REFERENCES bot_channel_connections(id) ON DELETE CASCADE,
                remote_ref TEXT NOT NULL,
                PRIMARY KEY (media_key, bot_channel_connection_id)
            );
        ` });
    },
    down(ctx: Context) {
        ctx.fns.procs.db.exec({ sql: "DROP TABLE IF EXISTS bot_media_uploads" });
    },
};
