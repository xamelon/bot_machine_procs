import { createHash } from "node:crypto";

// Queue one inbound event for a connection. Same idempotency key is a no-op.
export default function (ctx: Context, _session: Session | null, opts: { input: any; connectionId: number; idempotencyKey?: string }) {
    const input = opts.input ?? {};
    if (!opts.connectionId) throw new Error("connectionId is required");
    if (!input.channel || input.external_id == null) throw new Error("channel and external_id are required");
    const key = opts.idempotencyKey ?? createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const now = new Date().toISOString();
    const inserted = ctx.fns.procs.db.run({
        sql: `INSERT INTO bot_inbox_events (bot_channel_connection_id, channel, external_id, idempotency_key, payload, status, attempts, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
              ON CONFLICT(idempotency_key) DO NOTHING`,
        params: [opts.connectionId, input.channel, String(input.external_id), key, JSON.stringify(input), now, now],
    }).changes === 1;
    return { ok: true, idempotencyKey: key, inserted };
}
