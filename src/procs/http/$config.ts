// http module config. PORT env → config.port.
export default {
    port: { type: "integer", required: true, default: 3000, env: "PORT" },
    hostname: { type: "string", default: "0.0.0.0", env: "HTTP_HOST" },
} as const satisfies ConfigSchema;
