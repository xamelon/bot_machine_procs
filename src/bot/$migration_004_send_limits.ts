export default {
    up(ctx: Context) {
        ctx.fns.procs.db.exec({ sql: `
            CREATE TABLE bot_platform_limits (
                channel TEXT PRIMARY KEY,
                next_request_at INTEGER NOT NULL DEFAULT 0,
                paused_until INTEGER NOT NULL DEFAULT 0,
                last_limit_at INTEGER NOT NULL DEFAULT 0,
                backoff_seconds REAL NOT NULL DEFAULT 0
            );
            CREATE TABLE bot_recipient_limits (
                channel TEXT NOT NULL,
                external_id TEXT NOT NULL,
                next_send_at INTEGER NOT NULL,
                PRIMARY KEY (channel, external_id)
            );
            CREATE INDEX bot_recipient_limits_expiry ON bot_recipient_limits (next_send_at);
        ` });
    },
    down(ctx: Context) {
        ctx.fns.procs.db.exec({ sql: 'DROP TABLE bot_recipient_limits; DROP TABLE bot_platform_limits;' });
    },
};
