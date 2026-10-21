export default {
    pollMs: { type: "integer", default: 500, env: "BOT_POLL_MS" },
    processLimit: { type: "integer", default: 10, env: "BOT_PROCESS_LIMIT" },
    sendLimit: { type: "integer", default: 20, env: "BOT_SEND_LIMIT" },
    telegramRequestMs: { type: "integer", default: 40, env: "BOT_TELEGRAM_REQUEST_MS" },
    vkRequestMs: { type: "integer", default: 60, env: "BOT_VK_REQUEST_MS" },
    maxRequestMs: { type: "integer", default: 40, env: "BOT_MAX_REQUEST_MS" },
    rateLimitBackoffSeconds: { type: "integer", default: 2, env: "BOT_RATE_LIMIT_BACKOFF_SECONDS" },
    rateLimitMaxBackoffSeconds: { type: "integer", default: 300, env: "BOT_RATE_LIMIT_MAX_BACKOFF_SECONDS" },
    publicBaseUrl: { type: "string", default: "", env: "PUBLIC_BASE_URL" },
} as const satisfies ConfigSchema;
