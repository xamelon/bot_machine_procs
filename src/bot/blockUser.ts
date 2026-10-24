// The person blocked the bot (or the platform says they cannot be reached): mark
// them so broadcasts skip them. processInbox clears it when they write again.
export default function (ctx: Context, _session: Session | null, opts: { connectionId: number; externalId: string }) {
    const now = new Date().toISOString();
    const changes = ctx.fns.procs.db.run({
        sql: "UPDATE bot_users SET blocked_at = ?, updated_at = ? WHERE bot_channel_connection_id = ? AND external_id = ? AND blocked_at IS NULL",
        params: [now, now, opts.connectionId, String(opts.externalId)],
    }).changes;
    return { ok: true, blocked: changes > 0 };
}
