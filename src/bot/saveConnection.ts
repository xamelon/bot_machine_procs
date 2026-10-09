// Upsert one platform connection. credentials/config are JSON objects.
export default function (ctx: Context, _session: Session | null, opts: {
    channel: string;
    name: string;
    publicId: string;
    externalId?: string | null;
    status?: string;
    credentials?: Record<string, any>;
    config?: Record<string, any>;
}) {
    if (!opts.channel || !opts.name || !opts.publicId) throw new Error("channel, name and publicId are required");
    const now = new Date().toISOString();
    const row = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = ?", params: [opts.publicId] })[0];
    const values = [opts.channel, opts.name, opts.externalId ?? null, opts.status ?? "active", JSON.stringify(opts.credentials ?? {}), JSON.stringify(opts.config ?? {}), now];
    if (!row) {
        const id = ctx.fns.procs.db.insert({
            into: "bot_channel_connections",
            values: { channel: opts.channel, name: opts.name, external_id: opts.externalId ?? null, public_id: opts.publicId, status: opts.status ?? "active", credentials: JSON.stringify(opts.credentials ?? {}), config: JSON.stringify(opts.config ?? {}), created_at: now, updated_at: now },
        }).id;
        return { id, publicId: opts.publicId };
    }
    ctx.fns.procs.db.run({ sql: "UPDATE bot_channel_connections SET channel = ?, name = ?, external_id = ?, status = ?, credentials = ?, config = ?, updated_at = ? WHERE id = ?", params: [...values, row.id] });
    return { id: row.id, publicId: opts.publicId };
}
