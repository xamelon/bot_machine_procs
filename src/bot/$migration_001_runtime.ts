// End-state runtime schema from bot_machine, trimmed to core runtime (no admin/broadcast/media).
export default {
    up(ctx: Context) {
        ctx.fns.procs.db.exec({ sql: `
            PRAGMA foreign_keys = ON;
            CREATE TABLE IF NOT EXISTS bot_channel_connections (
                id INTEGER PRIMARY KEY,
                channel TEXT NOT NULL,
                name TEXT NOT NULL,
                external_id TEXT,
                public_id TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT 'active',
                credentials TEXT NOT NULL DEFAULT '{}',
                config TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS bot_channel_connections_channel_external ON bot_channel_connections (channel, external_id);

            CREATE TABLE IF NOT EXISTS bot_users (
                id INTEGER PRIMARY KEY,
                bot_channel_connection_id INTEGER NOT NULL REFERENCES bot_channel_connections(id) ON DELETE CASCADE,
                channel TEXT NOT NULL,
                external_id TEXT NOT NULL,
                display_name TEXT,
                metadata TEXT NOT NULL DEFAULT '{}',
                blocked_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (bot_channel_connection_id, external_id)
            );
            CREATE TABLE IF NOT EXISTS bot_flows (
                id INTEGER PRIMARY KEY,
                slug TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS bot_flow_versions (
                id INTEGER PRIMARY KEY,
                bot_flow_id INTEGER NOT NULL REFERENCES bot_flows(id) ON DELETE CASCADE,
                version INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                definition TEXT NOT NULL,
                published_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (bot_flow_id, version)
            );
            CREATE TABLE IF NOT EXISTS bot_flow_connections (
                id INTEGER PRIMARY KEY,
                bot_flow_id INTEGER NOT NULL REFERENCES bot_flows(id) ON DELETE CASCADE,
                bot_channel_connection_id INTEGER NOT NULL REFERENCES bot_channel_connections(id) ON DELETE CASCADE,
                enabled INTEGER NOT NULL DEFAULT 1,
                priority INTEGER NOT NULL DEFAULT 0,
                config TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (bot_flow_id, bot_channel_connection_id)
            );
            CREATE INDEX IF NOT EXISTS bot_flow_connections_connection ON bot_flow_connections (bot_channel_connection_id, enabled, priority);
            CREATE TABLE IF NOT EXISTS bot_triggers (
                id INTEGER PRIMARY KEY,
                bot_flow_id INTEGER NOT NULL REFERENCES bot_flows(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                channel TEXT NOT NULL,
                type TEXT NOT NULL,
                match TEXT NOT NULL,
                start_node_id TEXT NOT NULL,
                session_mode TEXT NOT NULL DEFAULT 'start_or_jump',
                priority INTEGER NOT NULL DEFAULT 0,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS bot_triggers_channel ON bot_triggers (channel, enabled, priority);
            CREATE TABLE IF NOT EXISTS bot_sessions (
                id INTEGER PRIMARY KEY,
                bot_user_id INTEGER NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
                bot_channel_connection_id INTEGER NOT NULL REFERENCES bot_channel_connections(id) ON DELETE CASCADE,
                flow_id TEXT NOT NULL,
                flow_version INTEGER NOT NULL,
                current_node_id TEXT NOT NULL,
                context TEXT NOT NULL DEFAULT '{}',
                completed_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS bot_sessions_connection_user ON bot_sessions (bot_channel_connection_id, bot_user_id, completed_at);
            CREATE TABLE IF NOT EXISTS bot_inbox_events (
                id INTEGER PRIMARY KEY,
                bot_channel_connection_id INTEGER NOT NULL REFERENCES bot_channel_connections(id) ON DELETE CASCADE,
                channel TEXT NOT NULL,
                external_id TEXT NOT NULL,
                idempotency_key TEXT NOT NULL UNIQUE,
                payload TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                attempts INTEGER NOT NULL DEFAULT 0,
                next_retry_at TEXT,
                last_error TEXT,
                processed_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS bot_inbox_connection_due ON bot_inbox_events (bot_channel_connection_id, status, next_retry_at);
            CREATE TABLE IF NOT EXISTS bot_outbox_messages (
                id INTEGER PRIMARY KEY,
                bot_channel_connection_id INTEGER NOT NULL REFERENCES bot_channel_connections(id) ON DELETE CASCADE,
                channel TEXT NOT NULL,
                external_id TEXT NOT NULL,
                idempotency_key TEXT NOT NULL UNIQUE,
                payload TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                attempts INTEGER NOT NULL DEFAULT 0,
                next_retry_at TEXT,
                last_error TEXT,
                sent_at TEXT,
                external_message_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS bot_outbox_connection_due ON bot_outbox_messages (bot_channel_connection_id, status, next_retry_at);
            CREATE TABLE IF NOT EXISTS bot_events (
                id INTEGER PRIMARY KEY,
                bot_session_id INTEGER REFERENCES bot_sessions(id) ON DELETE SET NULL,
                bot_channel_connection_id INTEGER REFERENCES bot_channel_connections(id) ON DELETE SET NULL,
                flow_id TEXT NOT NULL,
                node_id TEXT,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS bot_events_connection_flow ON bot_events (bot_channel_connection_id, flow_id, created_at);
        ` });
        const now = new Date().toISOString();
        ctx.fns.procs.db.run({
            sql: `INSERT INTO bot_channel_connections (channel, name, external_id, public_id, status, credentials, config, created_at, updated_at)
                  VALUES ('echo', 'Echo sandbox', 'sandbox', 'conn_echo', 'active', '{}', '{}', ?, ?)
                  ON CONFLICT(public_id) DO NOTHING`,
            params: [now, now],
        });
    },
    down(ctx: Context) {
        ctx.fns.procs.db.exec({ sql: `
            DROP TABLE IF EXISTS bot_events;
            DROP TABLE IF EXISTS bot_outbox_messages;
            DROP TABLE IF EXISTS bot_inbox_events;
            DROP TABLE IF EXISTS bot_sessions;
            DROP TABLE IF EXISTS bot_triggers;
            DROP TABLE IF EXISTS bot_flow_connections;
            DROP TABLE IF EXISTS bot_flow_versions;
            DROP TABLE IF EXISTS bot_flows;
            DROP TABLE IF EXISTS bot_users;
            DROP TABLE IF EXISTS bot_channel_connections;
        ` });
    },
};
