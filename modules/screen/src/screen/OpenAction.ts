// One closed, JSON-serializable step in an atomic screen.open browser flow.
// No arbitrary JavaScript: each step uses the same semantic resolver as the
// standalone screen verbs.
export type OpenAction =
    | { fill: { form: string; values: Record<string, string | number | boolean>; show?: boolean } }
    | { click: types.screen.Descriptor & { show?: boolean } }
    | { submit: { form: string; show?: boolean } }
    | { waitFor: types.screen.Descriptor & { status?: string; text?: string; absent?: boolean; timeoutMs?: number } };
