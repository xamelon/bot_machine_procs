// Ask the channel adapter to register this connection's webhook and store what it learned.
export default async function (ctx: Context, _session: Session | null, opts: { publicId: string; waitMs?: number }) {
    const row = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_channel_connections WHERE public_id = ?", params: [opts.publicId] })[0];
    if (!row) throw new Error(`unknown connection ${opts.publicId}`);
    const connection = { ...row, credentials: JSON.parse(row.credentials || "{}"), config: JSON.parse(row.config || "{}") };
    const result = await ctx.fns.procs.hooks.first({
        name: `bot.adapter.${connection.channel}`,
        opts: { phase: "provision", connection, waitMs: opts.waitMs },
    });
    if (!result) throw new Error(`unknown channel ${connection.channel}`);
    const now = new Date().toISOString();
    const credentials = { ...connection.credentials, ...(result.credentials ?? {}) };
    const config = { ...connection.config, ...(result.config ?? {}), last_provision_error: result.ok === false ? String(result.error ?? "provision failed") : null };
    ctx.fns.procs.db.run({
        sql: "UPDATE bot_channel_connections SET external_id = ?, credentials = ?, config = ?, updated_at = ? WHERE id = ?",
        params: [result.externalId ?? connection.external_id, JSON.stringify(credentials), JSON.stringify(config), now, connection.id],
    });
    return { ok: result.ok !== false, error: result.error, publicId: opts.publicId };
}
