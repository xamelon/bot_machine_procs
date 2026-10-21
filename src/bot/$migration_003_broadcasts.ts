export default {
    up(ctx: Context) {
        ctx.fns.procs.db.exec({ sql: `
            CREATE TABLE bot_broadcasts (
                id INTEGER PRIMARY KEY,
                bot_channel_connection_id INTEGER NOT NULL REFERENCES bot_channel_connections(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                filters TEXT NOT NULL,
                query TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'draft',
                created_at TEXT NOT NULL,
                started_at TEXT
            );
            ALTER TABLE bot_outbox_messages ADD COLUMN bot_broadcast_id INTEGER REFERENCES bot_broadcasts(id);
            CREATE INDEX bot_outbox_broadcast ON bot_outbox_messages (bot_broadcast_id, status);
        ` });
    },
    down(ctx: Context) {
        ctx.fns.procs.db.exec({ sql: `
            DELETE FROM bot_outbox_messages WHERE bot_broadcast_id IS NOT NULL;
            DROP INDEX bot_outbox_broadcast;
            ALTER TABLE bot_outbox_messages DROP COLUMN bot_broadcast_id;
            DROP TABLE bot_broadcasts;
        ` });
    },
};
