// First matching trigger. Higher priority wins; a concrete channel beats "*" at the same priority.
export default function (_ctx: Context, _session: Session | null, opts: { input: any; triggers: any[] }) {
    const input = opts.input ?? {};
    const hit = (opts.triggers ?? [])
        .filter((t) => t?.enabled && (t.channel === input.channel || t.channel === "*"))
        .filter((t) => matches(input, t))
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || spec(b) - spec(a));
    return hit[0] ?? null;
}

function spec(trigger: any) {
    return trigger.channel === "*" ? 0 : 1;
}

function matches(input: any, trigger: any): boolean {
    const match = trigger.match ?? {};
    if (input.kind === "user_message" && trigger.type === "command") return commandName(input.text) === match.command;
    if (input.kind === "user_message" && trigger.type === "text_exact") return norm(input.text) === norm(match.text);
    if (input.kind === "user_message" && trigger.type === "text_contains") return norm(input.text).includes(norm(match.text));
    if (input.kind === "user_message" && trigger.type === "payload") {
        if (input.payload != null && Object.prototype.hasOwnProperty.call(match, "payload")) return input.payload === match.payload;
        if (input.payload != null && match.payloadPrefix) return String(input.payload).startsWith(String(match.payloadPrefix));
        if (input.text != null && match.text != null) return norm(input.text) === norm(match.text);
        return false;
    }
    const kinds = ["domain_event", "schedule", "manual", "system_event"];
    const types = ["event", "schedule", "manual"];
    if (kinds.includes(input.kind) && types.includes(trigger.type) && match.event != null && input.event === match.event) {
        return trigger.type === (input.kind === "domain_event" || input.kind === "system_event" ? "event" : input.kind);
    }
    return false;
}

function norm(value: unknown) {
    return String(value ?? "").trim().toLowerCase();
}

function commandName(value: unknown) {
    return norm(value).replace(/^\//, "").split(/\s+/, 1)[0] ?? "";
}
