// Pace actual API requests, including media/provisioning. Limits are shared across connections per platform.
// https://core.telegram.org/bots/faq#broadcasting-to-users
// https://dev.vk.com/ru/api/api-requests
// https://dev.max.ru/docs/chatbots/bots-coding/prepare and /docs-api/methods/POST/messages
// shortcut: in-flight sends need leases if multiple runtimes share this DB.
export default async function (ctx: Context, _session: Session | null, opts: {
    channel: 'telegram' | 'vk' | 'max'; url: string; init?: BunFetchRequestInit; recipient?: string;
}) {
    const config = ctx.fns.procs.config.resolve({ module: 'bot' });
    const interval = opts.channel === 'vk' ? Math.max(51, config.vkRequestMs)
        : opts.channel === 'max' ? Math.max(34, config.maxRequestMs) : Math.max(34, config.telegramRequestMs);
    const recipientInterval = opts.recipient === undefined ? 0 : opts.channel === 'telegram'
        ? opts.recipient.startsWith('-') ? 3100 : 1000 : opts.channel === 'max' ? 500 : 0;
    for (;;) {
        const wait = ctx.fns.procs.db.conn().transaction(() => {
            const now = Date.now();
            const platform = ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_platform_limits WHERE channel = ?', params: [opts.channel] })[0];
            if (platform?.paused_until > now) throw Object.assign(new Error(`${opts.channel} is rate limited`), { rateLimited: true, retryAfter: Math.ceil((platform.paused_until - now) / 1000) });
            const recipient = recipientInterval ? ctx.fns.procs.db.select({ sql: 'SELECT next_send_at FROM bot_recipient_limits WHERE channel = ? AND external_id = ?', params: [opts.channel, opts.recipient] })[0] : null;
            const delay = Math.max(platform?.next_request_at ?? 0, recipient?.next_send_at ?? 0) - now;
            if (delay > 0) return delay;
            ctx.fns.procs.db.run({
                sql: `INSERT INTO bot_platform_limits (channel, next_request_at) VALUES (?, ?)
                    ON CONFLICT(channel) DO UPDATE SET next_request_at = excluded.next_request_at`,
                params: [opts.channel, now + interval],
            });
            ctx.fns.procs.db.run({ sql: 'DELETE FROM bot_recipient_limits WHERE next_send_at <= ?', params: [now] });
            if (recipientInterval) ctx.fns.procs.db.run({
                sql: `INSERT INTO bot_recipient_limits (channel, external_id, next_send_at) VALUES (?, ?, ?)
                    ON CONFLICT(channel, external_id) DO UPDATE SET next_send_at = excluded.next_send_at`,
                params: [opts.channel, opts.recipient, now + recipientInterval],
            });
            return 0;
        })();
        if (!wait) break;
        await Bun.sleep(wait);
    }
    const response = await fetch(opts.url, opts.init);
    const json: any = await response.clone().json().catch(() => ({}));
    const limited = response.status === 429 || (opts.channel === 'telegram' && json.error_code === 429)
        || (opts.channel === 'vk' && [6, 9, 29].includes(json.error?.error_code));
    let retryAfter: number | undefined;
    if (limited) {
        const header = response.headers.get('retry-after');
        const headerSeconds = header === null ? NaN : /^\d+(\.\d+)?$/.test(header.trim()) ? Number(header) : (Date.parse(header) - Date.now()) / 1000;
        const telegramSeconds = opts.channel === 'telegram' ? Number(json.parameters?.retry_after ?? json.retry_after ?? NaN) : NaN;
        const delays = [headerSeconds, telegramSeconds].filter(Number.isFinite);
        retryAfter = ctx.fns.bot.pausePlatform({ channel: opts.channel, retryAfter: delays.length ? Math.max(...delays) : undefined });
    }
    return { response, retryAfter };
}
