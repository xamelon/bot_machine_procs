export default async function (_ctx: Context, _session: Session | null, opts: any) {
    if (opts.phase === "parse") {
        const body = opts.body ?? {};
        const external_id = String(body.external_id ?? body.user_id ?? "demo");
        return {
            idempotencyKey: body.idempotency_key,
            input: withStartParam({
                kind: "user_message",
                channel: "echo",
                external_id,
                text: String(body.text ?? ""),
                payload: body.payload ?? undefined,
                attachments: body.attachments ?? [],
                metadata: body.metadata ?? {},
            }),
        };
    }
    if (opts.phase === "send") return { ok: true, externalMessageId: `echo:${Date.now()}` };
}
function withStartParam(input: any) {
    const parts = String(input.text ?? "").trim().split(/\s+/, 2);
    if ((parts[0] ?? "").replace(/^\//, "").toLowerCase() === "start" && parts[1]) input.start_param = parts[1];
    return input;
}
