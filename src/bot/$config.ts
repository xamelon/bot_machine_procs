export default {
    pollMs: { type: "integer", default: 500, env: "BOT_POLL_MS" },
    processLimit: { type: "integer", default: 10, env: "BOT_PROCESS_LIMIT" },
    sendLimit: { type: "integer", default: 20, env: "BOT_SEND_LIMIT" },
    telegramRequestMs: { type: "integer", default: 40, env: "BOT_TELEGRAM_REQUEST_MS" },
    vkRequestMs: { type: "integer", default: 60, env: "BOT_VK_REQUEST_MS" },
    maxRequestMs: { type: "integer", default: 40, env: "BOT_MAX_REQUEST_MS" },
    rateLimitBackoffSeconds: { type: "integer", default: 2, env: "BOT_RATE_LIMIT_BACKOFF_SECONDS" },
    rateLimitMaxBackoffSeconds: { type: "integer", default: 300, env: "BOT_RATE_LIMIT_MAX_BACKOFF_SECONDS" },
    // A failed inbox/outbox row is retried after base·2^(attempt-1) seconds, at most
    // retryMaxDelaySeconds apart, until it is retryGiveUpHours old; then it is `dead`.
    retryBaseSeconds: { type: "integer", default: 5, env: "BOT_RETRY_BASE_SECONDS" },
    retryMaxDelaySeconds: { type: "integer", default: 1800, env: "BOT_RETRY_MAX_DELAY_SECONDS" },
    retryGiveUpHours: { type: "integer", default: 24, env: "BOT_RETRY_GIVE_UP_HOURS" },
    publicBaseUrl: { type: "string", default: "", env: "PUBLIC_BASE_URL" },
    // Whose clock and language `bot.formatDate` / `bot.date` speak: the audience's,
    // not the server's (Docker runs in UTC).
    timeZone: { type: "string", default: "Europe/Moscow", env: "BOT_TIMEZONE" },
    locale: { type: "string", default: "ru-RU", env: "BOT_LOCALE" },
} as const satisfies ConfigSchema;
