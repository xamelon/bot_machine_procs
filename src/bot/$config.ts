export default {
    pollMs: { type: "integer", default: 500, env: "BOT_POLL_MS" },
    processLimit: { type: "integer", default: 10, env: "BOT_PROCESS_LIMIT" },
    sendLimit: { type: "integer", default: 20, env: "BOT_SEND_LIMIT" },
    publicBaseUrl: { type: "string", default: "", env: "PUBLIC_BASE_URL" },
} as const satisfies ConfigSchema;
