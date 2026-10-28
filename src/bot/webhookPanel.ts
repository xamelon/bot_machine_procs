// Request builder only: never embeds the configured secret or sends a request.
export default function (ctx: Context, session: Session | null, _opts: {}) {
    const ui = ctx.fns.procs.ui;
    const esc = (text: any) => ui.escape({ text });
    const config = ctx.fns.procs.config.resolve({ module: "bot" });
    const base = (config.publicBaseUrl || (session?.req ? new URL(session.req.url).origin : "")).replace(/\/$/, "");
    const connections = ctx.fns.procs.db.select({ sql: "SELECT public_id, name FROM bot_channel_connections WHERE status = 'active' ORDER BY id" });
    const flows = ctx.fns.procs.db.select({ sql: `SELECT f.slug, f.name, v.definition FROM bot_flows f JOIN bot_flow_versions v ON v.id =
        (SELECT id FROM bot_flow_versions WHERE bot_flow_id = f.id AND status IN ('published', 'draft') ORDER BY version DESC LIMIT 1) ORDER BY f.name` });
    const catalog = flows.map((flow: any) => ({ slug: flow.slug, nodes: (JSON.parse(flow.definition).nodes ?? []).map((node: any) => node.id) }));
    const select = (name: string, label: string, items: Array<{ label: string; value: string; description?: string }>) => ui.selector({ name, label, items, value: items[0]?.value });
    const options = (rows: any[], value: string) => rows.map(row => ({ label: row.name, value: row[value], description: row[value] }));
    const parameters = `<div class="asx-form asx-trigger-form bot-webhook__params">
        <div class="asx-trigger-form__row">
        ${select("connection_id", "Connection", options(connections, "public_id"))}
        ${select("flow_slug", "Flow", options(flows, "slug"))}
        </div>
        ${ctx.fns.bot.input({ name: "vk_user_id", label: "User ID", placeholder: "42" })}
        ${ui.collapsible({ title: "Advanced options", body: ui.stack({ body:
            select("start_node_id", "Start node", [{ label: "Flow start node", value: "" }]) +
            select("session_mode", "Session mode", ["start_or_jump", "restart", "notify_only"].map(mode => ({ label: mode, value: mode }))) +
            ctx.fns.bot.input({ name: "idempotency_key", label: "Idempotency key", placeholder: "Optional — use a unique key per event" })
        }) })}
        <p>Connect the flow to this channel. POST JSON with your secret; it is never shown here.</p>
        </div>`;
    const preview = `<section class="bot-webhook__code" aria-label="Webhook JSON">
        ${ui.inputGroup({ class: "bot-webhook__url", control: `<input class="asx-input" type="text" aria-label="Webhook URL" readonly value="${esc(base + "/bot/public/senler")}" data-bot-webhook-url>`, end: `<button type="button" class="asx-button" data-variant="ghost" data-size="sm" aria-label="Copy URL" title="Copy URL" data-bot-webhook-copy-url><span class="asx-button__icon"><i class="ph ph-copy" aria-hidden="true"></i></span></button>` })}
        <div class="bot-webhook__heading"><strong>JSON request</strong><button type="button" class="asx-button" data-variant="secondary" data-size="sm" data-bot-webhook-copy><span class="asx-button__label">Copy JSON</span></button></div>
        <div data-bot-webhook-preview>${ui.codeBlock({ code: "", language: "json" })}</div><span data-bot-webhook-copy-status role="status"></span>
        </section>`;
    const body = `${!config.webhookSecret?.trim() ? ui.banner({ tone: "warning", body: "Webhook API is disabled. Configure WEBHOOK_SECRET to enable it." }) : ""}
        <div class="bot-webhook" data-bot-webhook data-url="${esc(base + "/bot/public/senler")}" data-flows="${esc(JSON.stringify(catalog))}">
        ${ui.grid({ columns: { narrow: 1, medium: 2 }, gap: 5, body: parameters + preview })}
        </div><script src="/bot/webhook.js" defer></script>`;
    return ui.card({ title: "Webhook", description: "Start a flow via Senler WebHook API 2.", body });
}
