// Drain due inbox into sessions, events, and outbox.
// ponytail: one process/ctx owns this database. Multi-process consumers need DB leases.
// Explicit call, no poller or channel send. Actions must be idempotent: recovery replays them.
export default async function (ctx: Context, _session: Session | null, opts?: { limit?: number }) {
    const limit = opts?.limit ?? 10;
    if (!Number.isInteger(limit) || limit < 1) throw new Error("limit must be a positive integer");
    const state = (ctx.state.bot ??= {});
    if (state.processing) throw new Error("inbox processing already running");
    state.processing = true;
    try {
        if (!state.recovered) {
            ctx.fns.procs.db.run({ sql: "UPDATE bot_inbox_events SET status = 'pending', next_retry_at = NULL WHERE status = 'processing'" });
            state.recovered = true;
        }
        return await drain(ctx, limit);
    } finally {
        state.processing = false;
    }
}

async function drain(ctx: Context, limit: number) {
    const now = new Date().toISOString();
    const due = ctx.fns.procs.db.select({
        sql: `SELECT * FROM bot_inbox_events
              WHERE status IN ('pending', 'failed') AND (next_retry_at IS NULL OR next_retry_at <= ?)
              ORDER BY id ASC LIMIT ?`,
        params: [now, limit],
    });
    let processed = 0;
    let failed = 0;
    for (const event of due) {
        try {
            await one(ctx, event);
            processed++;
        } catch (err: any) {
            fail(ctx, event, String(err?.message ?? err));
            failed++;
        }
    }
    return { processed, failed, more: due.length === limit };
}

async function one(ctx: Context, event: any) {
    const attempts = Number(event.attempts) + 1;
    const now = new Date().toISOString();
    ctx.fns.procs.db.run({
        sql: "UPDATE bot_inbox_events SET status = 'processing', attempts = ?, updated_at = ? WHERE id = ?",
        params: [attempts, now, event.id],
    });
    const input = JSON.parse(event.payload);
    const connectionId = event.bot_channel_connection_id;
    const user = upsertUser(ctx, connectionId, input);
    const session = active(ctx, connectionId, user.id);
    const forced = forcedFlow(ctx, connectionId, input);
    const trigger = forced?.trigger ?? findTrigger(ctx, connectionId, input);
    if (!session && !trigger) {
        markProcessed(ctx, event.id);
        return;
    }
    const version = forced?.version ?? flowVersion(ctx, session, trigger);
    if (!version) throw new Error("no runnable bot flow version");
    const definition = JSON.parse(version.definition);
    definition.version ??= version.version;
    const result = await ctx.fns.bot.run({
        flow: definition,
        input,
        session: session ? toDialog(session, input) : null,
        trigger,
    });
    const db = ctx.fns.procs.db.conn();
    db.transaction(() => {
        const sessionId = saveSession(ctx, connectionId, user.id, result.session);
        for (const ev of result.events) saveEvent(ctx, connectionId, sessionId, ev);
        result.outputs.forEach((output: any, index: number) => saveOutbox(ctx, connectionId, output, `${event.idempotency_key}:out:${index}`));
        markProcessed(ctx, event.id);
    })();
}

function upsertUser(ctx: Context, connectionId: number, input: any) {
    const now = new Date().toISOString();
    const row = ctx.fns.procs.db.select({
        sql: "SELECT * FROM bot_users WHERE bot_channel_connection_id = ? AND external_id = ?",
        params: [connectionId, String(input.external_id)],
    })[0];
    const incoming = input.metadata && typeof input.metadata === "object" ? input.metadata : {};
    if (!row) {
        const id = Number(ctx.fns.procs.db.insert({
            into: "bot_users",
            values: {
                bot_channel_connection_id: connectionId,
                channel: input.channel,
                external_id: String(input.external_id),
                display_name: input.display_name ?? null,
                metadata: JSON.stringify(incoming),
                created_at: now,
                updated_at: now,
            },
        }).id);
        return { id };
    }
    const prev = JSON.parse(row.metadata || "{}");
    const metadata = { ...prev, ...incoming };
    const display = input.display_name || row.display_name;
    if (display !== row.display_name || JSON.stringify(metadata) !== JSON.stringify(prev)) {
        ctx.fns.procs.db.run({
            sql: "UPDATE bot_users SET display_name = ?, metadata = ?, updated_at = ? WHERE id = ?",
            params: [display, JSON.stringify(metadata), now, row.id],
        });
    }
    return { id: row.id };
}

function active(ctx: Context, connectionId: number, userId: number) {
    return ctx.fns.procs.db.select({
        sql: "SELECT * FROM bot_sessions WHERE bot_channel_connection_id = ? AND bot_user_id = ? AND completed_at IS NULL ORDER BY updated_at DESC, id DESC LIMIT 1",
        params: [connectionId, userId],
    })[0] ?? null;
}

function findTrigger(ctx: Context, connectionId: number, input: any) {
    const rows = ctx.fns.procs.db.select({
        sql: `SELECT t.* FROM bot_triggers t
              JOIN bot_flow_connections fc ON fc.bot_flow_id = t.bot_flow_id
              WHERE fc.bot_channel_connection_id = ? AND fc.enabled = 1 AND t.enabled = 1 AND t.channel IN (?, '*')`,
        params: [connectionId, input.channel],
    }).map(triggerMap);
    return ctx.fns.bot.match({ input, triggers: rows });
}

function forcedFlow(ctx: Context, connectionId: number, input: any) {
    const slug = typeof input.flow_slug === "string" ? input.flow_slug.trim() : "";
    if (!slug) return null;
    const flow = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_flows WHERE slug = ?", params: [slug] })[0];
    if (!flow) throw new Error(`unknown bot flow ${slug}`);
    const version = latest(ctx, flow.id);
    if (!version) throw new Error(`no runnable version for bot flow ${slug}`);
    const linked = ctx.fns.procs.db.select({
        sql: "SELECT id FROM bot_flow_connections WHERE bot_flow_id = ? AND bot_channel_connection_id = ? AND enabled = 1",
        params: [flow.id, connectionId],
    })[0];
    if (!linked) throw new Error(`flow ${slug} is not connected`);
    const definition = JSON.parse(version.definition);
    return {
        version,
        trigger: {
            id: `hook:${slug}`,
            start_node_id: input.start_node_id || definition.start_node_id,
            session_mode: input.session_mode || "start_or_jump",
            enabled: true,
            channel: "*",
        },
    };
}

function flowVersion(ctx: Context, session: any, trigger: any) {
    if (trigger?.id && !String(trigger.id).startsWith("hook:")) {
        const row = ctx.fns.procs.db.select({ sql: "SELECT bot_flow_id FROM bot_triggers WHERE id = ?", params: [trigger.id] })[0];
        if (row) return latest(ctx, row.bot_flow_id);
    }
    if (session) {
        return ctx.fns.procs.db.select({
            sql: `SELECT v.* FROM bot_flow_versions v
                  JOIN bot_flows f ON f.id = v.bot_flow_id
                  WHERE f.slug = ? AND v.status IN ('published', 'draft')
                  ORDER BY v.version DESC LIMIT 1`,
            params: [session.flow_id],
        })[0] ?? null;
    }
    return null;
}

function latest(ctx: Context, flowId: number) {
    return ctx.fns.procs.db.select({
        sql: `SELECT * FROM bot_flow_versions
              WHERE bot_flow_id = ? AND status IN ('published', 'draft')
              ORDER BY version DESC LIMIT 1`,
        params: [flowId],
    })[0] ?? null;
}

function toDialog(row: any, input: any) {
    return {
        id: row.id,
        channel: input.channel,
        externalId: input.external_id,
        flowId: row.flow_id,
        flowVersion: row.flow_version,
        currentNodeId: row.current_node_id,
        context: JSON.parse(row.context || "{}"),
        completed: false,
    };
}

function saveSession(ctx: Context, connectionId: number, userId: number, dialog: any) {
    const now = new Date().toISOString();
    const completedAt = dialog.completed ? now : null;
    const current = ctx.fns.procs.db.select({
        sql: "SELECT id FROM bot_sessions WHERE bot_channel_connection_id = ? AND bot_user_id = ? AND completed_at IS NULL ORDER BY id DESC LIMIT 1",
        params: [connectionId, userId],
    })[0];
    const values = [dialog.flowId, dialog.flowVersion ?? 0, dialog.currentNodeId, JSON.stringify(dialog.context ?? {}), completedAt, now];
    if (!current) {
        return Number(ctx.fns.procs.db.insert({
            into: "bot_sessions",
            values: {
                bot_user_id: userId,
                bot_channel_connection_id: connectionId,
                flow_id: dialog.flowId,
                flow_version: dialog.flowVersion ?? 0,
                current_node_id: dialog.currentNodeId,
                context: JSON.stringify(dialog.context ?? {}),
                completed_at: completedAt,
                created_at: now,
                updated_at: now,
            },
        }).id);
    }
    ctx.fns.procs.db.run({
        sql: "UPDATE bot_sessions SET flow_id = ?, flow_version = ?, current_node_id = ?, context = ?, completed_at = ?, updated_at = ? WHERE id = ?",
        params: [...values, current.id],
    });
    return current.id;
}

function saveEvent(ctx: Context, connectionId: number, sessionId: number, ev: any) {
    ctx.fns.procs.db.insert({
        into: "bot_events",
        values: {
            bot_session_id: sessionId,
            bot_channel_connection_id: connectionId,
            flow_id: ev.flow_id,
            node_id: ev.node_id,
            event_type: ev.event_type,
            payload: "{}",
            created_at: new Date().toISOString(),
        },
    });
}

function saveOutbox(ctx: Context, connectionId: number, output: any, key: string) {
    const now = new Date().toISOString();
    ctx.fns.procs.db.run({
        sql: `INSERT INTO bot_outbox_messages (bot_channel_connection_id, channel, external_id, idempotency_key, payload, status, attempts, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
              ON CONFLICT(idempotency_key) DO NOTHING`,
        params: [connectionId, output.channel, String(output.external_id), key, JSON.stringify(output), now, now],
    });
}

function markProcessed(ctx: Context, id: number) {
    const now = new Date().toISOString();
    ctx.fns.procs.db.run({
        sql: "UPDATE bot_inbox_events SET status = 'processed', processed_at = ?, last_error = NULL, updated_at = ? WHERE id = ?",
        params: [now, now, id],
    });
}

function fail(ctx: Context, event: any, reason: string) {
    const attempts = Number(event.attempts) + 1;
    const at = new Date(Date.now() + Math.min(60, attempts) * 1000).toISOString();
    ctx.fns.procs.db.run({
        sql: "UPDATE bot_inbox_events SET status = 'failed', attempts = ?, last_error = ?, next_retry_at = ?, updated_at = ? WHERE id = ?",
        params: [attempts, reason, at, new Date().toISOString(), event.id],
    });
}

function triggerMap(row: any) {
    return {
        id: String(row.id),
        name: row.name,
        channel: row.channel,
        type: row.type,
        match: JSON.parse(row.match || "{}"),
        start_node_id: row.start_node_id,
        session_mode: row.session_mode,
        priority: row.priority,
        enabled: row.enabled === 1,
    };
}
