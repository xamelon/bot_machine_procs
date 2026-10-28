import { randomUUID, timingSafeEqual } from "node:crypto";

// Senler WebHook API 2. After authentication, application errors stay HTTP 200
// to avoid Senler retry storms. No stored trigger is needed.
export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const { webhookSecret } = ctx.fns.procs.config.resolve({ module: "bot" });
    if (!webhookSecret?.trim()) return Response.json({ ok: false, error: "Webhook API is disabled (WEBHOOK_SECRET is not configured)" }, { status: 503 });
    let params: any;
    try { params = await opts.req.json(); }
    catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
    if (!params || typeof params !== "object" || Array.isArray(params)) return Response.json({ ok: false, error: "Expected a JSON object" }, { status: 400 });
    const supplied = Buffer.from(typeof params.secret === "string" ? params.secret : "");
    const expected = Buffer.from(webhookSecret);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return Response.json({ ok: false, error: "Invalid webhook secret" }, { status: 401 });
    const fail = (error: string) => Response.json({ ok: false, error });
    const reference = params.connection_id;
    const connection = typeof reference === "string" || typeof reference === "number"
        ? ctx.fns.procs.db.select({
            sql: "SELECT * FROM bot_channel_connections WHERE status = 'active' AND (public_id = ? OR CAST(id AS TEXT) = ?)",
            params: [String(reference), String(reference)],
        })[0] : null;
    if (!connection) return fail("connection_id is required and must reference an active connection");
    const externalId = params.vk_user_id ?? params.user_id;
    if (!((typeof externalId === "string" && externalId.trim()) || (typeof externalId === "number" && Number.isFinite(externalId)))) return fail("vk_user_id is required");
    if (typeof params.flow_slug !== "string" || !params.flow_slug.trim()) return fail("flow_slug is required");
    const slug = params.flow_slug.trim();
    const modes = ["restart", "start_or_jump", "notify_only"];
    if (params.session_mode != null && !modes.includes(params.session_mode)) return fail(`session_mode must be one of ${modes.join(", ")}`);
    const flow = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_flows WHERE slug = ?", params: [slug] })[0];
    if (!flow) return fail(`unknown flow_slug ${slug}`);
    const version = ctx.fns.procs.db.select({ sql: "SELECT definition FROM bot_flow_versions WHERE bot_flow_id = ? AND status IN ('published', 'draft') ORDER BY version DESC LIMIT 1", params: [flow.id] })[0];
    if (!version) return fail(`flow ${slug} has no runnable version`);
    const linked = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_flow_connections WHERE bot_flow_id = ? AND bot_channel_connection_id = ? AND enabled = 1", params: [flow.id, connection.id] })[0];
    if (!linked) return fail(`flow ${slug} is not connected`);
    const definition = JSON.parse(version.definition);
    const nodeId = params.start_node_id ?? definition.start_node_id;
    if (typeof nodeId !== "string" || !(definition.nodes ?? []).some((node: any) => node.id === nodeId)) return fail("unknown start_node_id in flow " + slug);
    if (params.idempotency_key != null && (typeof params.idempotency_key !== "string" || !params.idempotency_key.trim())) return fail("idempotency_key must be a non-empty string");
    const input = { kind: "manual", event: `hook.${slug}`, channel: connection.channel, external_id: String(externalId), flow_slug: slug, start_node_id: nodeId, session_mode: params.session_mode ?? "start_or_jump" };
    try {
        ctx.fns.bot.ingest({ input, connectionId: connection.id, idempotencyKey: `${connection.public_id}:${params.idempotency_key ?? `senler:${randomUUID()}`}` });
        return Response.json({ ok: true });
    } catch {
        return fail("Unable to enqueue webhook event");
    }
}
