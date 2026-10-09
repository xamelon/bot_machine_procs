// A module is a NAMESPACE that has module-shaped files — at any depth. This one
// is `hs.ui`, and config.resolve({ module: "hs/ui" }) reads it.
export default {
    theme: { type: "string", default: "light", env: "HS_UI_THEME" },
} as const satisfies ConfigSchema;
