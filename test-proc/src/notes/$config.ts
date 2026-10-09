// A module's config schema. Values resolve defaults < package.json proc.prod <
// workspace.json < environment, are coerced to the declared type and validated —
// so a bad value fails at boot with a name, not at midnight with a stack trace.
export default {
    title: { type: "string", default: "Notes", env: "NOTES_TITLE" },
    limit: { type: "integer", default: 20, env: "NOTES_LIMIT" },
} as const satisfies ConfigSchema;
