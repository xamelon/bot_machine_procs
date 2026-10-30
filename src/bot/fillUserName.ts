// Best-effort VK profile enrichment: callers deliberately do not await it.
// In-flight deduplication, bounded concurrency and cooldown survive hot reload.
export default async function (ctx: Context, _session: Session | null, opts: { userId: number }) {
    const state = (ctx.state.bot ??= {});
    const pending = (state.profilePending ??= new Set<number>());
    const retry = (state.profileRetry ??= new Map<number, number>());
    const now = Date.now();
    for (const [id, until] of retry) if (until <= now) retry.delete(id);
    if (pending.has(opts.userId) || pending.size >= 4 || retry.has(opts.userId)) return;
    const row = ctx.fns.procs.db.select({
        sql: `SELECT u.external_id, u.display_name, c.credentials FROM bot_users u
              JOIN bot_channel_connections c ON c.id = u.bot_channel_connection_id
              WHERE u.id = ? AND u.channel = 'vk' AND c.status = 'active'`, params: [opts.userId],
    })[0];
    if (!row || row.display_name?.trim() || !/^[1-9]\d*$/.test(row.external_id)) return;
    const token = JSON.parse(row.credentials || '{}').group_access_token;
    if (!token) return;
    pending.add(opts.userId);
    // Bound failed-profile retry memory; dropping an old cooldown is safe.
    if (retry.size >= 1000) retry.delete(retry.keys().next().value!);
    retry.set(opts.userId, now + 5 * 60_000);
    try {
        const { response } = await ctx.fns.bot.platformFetch({ channel: 'vk', priority: 'background', url: 'https://api.vk.com/method/users.get', init: {
            method: 'POST', signal: AbortSignal.timeout(5000),
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ user_ids: row.external_id, v: '5.199' }),
        } });
        const body = await response.json();
        const profile = body.response?.[0];
        if (!response.ok || body.error || String(profile?.id) !== row.external_id) return;
        const name = [profile.first_name, profile.last_name].filter(value => typeof value === 'string' && value.trim()).join(' ').trim();
        if (!name) return;
        ctx.fns.procs.db.run({ sql: `UPDATE bot_users SET display_name = ?, updated_at = ? WHERE id = ? AND (display_name IS NULL OR TRIM(display_name) = '')`, params: [name, new Date().toISOString(), opts.userId] });
        retry.delete(opts.userId);
    } finally { pending.delete(opts.userId); }
}
