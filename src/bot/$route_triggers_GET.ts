export default function (ctx: Context, session: Session | null, _opts: {}) {
    const ui = ctx.fns.procs.ui;
    const esc = (s: any) => ui.escape({ text: s });
    const url = session?.req ? new URL(session.req.url) : null;
    const notice = url?.searchParams.get("notice") ?? "";
    const tone = url?.searchParams.get("tone") ?? "success";

    const flows = ctx.fns.procs.db.select({ sql: `SELECT f.slug, f.name, v.definition
        FROM bot_flows f
        LEFT JOIN bot_flow_versions v ON v.id = (SELECT id FROM bot_flow_versions WHERE bot_flow_id = f.id ORDER BY version DESC LIMIT 1)
        ORDER BY f.name` });
    const connections = ctx.fns.procs.db.select({ sql: "SELECT channel, name FROM bot_channel_connections ORDER BY id" });
    const rows = ctx.fns.procs.db.select({ sql: `SELECT t.id, f.slug flow, t.name, t.channel, t.type, t.match, t.start_node_id, t.enabled
        FROM bot_triggers t JOIN bot_flows f ON f.id = t.bot_flow_id ORDER BY t.priority DESC, t.id` });

    const matched = (raw: any) => {
        try { return JSON.parse(raw || "{}"); } catch { return {}; }
    };
    const matchLabel = (row: any) => {
        const match = matched(row.match);
        if (row.type === "command") return `<code>/${esc(match.command ?? "")}</code>`;
        if (match.text != null) return `<code>${esc(match.text)}</code>`;
        if (match.event != null) return `<code>${esc(match.event)}</code>`;
        if (match.payload != null) return `<code>${esc(match.payload)}</code>`;
        return "—";
    };
    const typeLabel: Record<string, string> = { command: "Command", text_exact: "Exact text", text_contains: "Contains", payload: "Button", event: "Event" };

    const table = ui.table({ columns: [
        { key: "name", label: "Name" },
        { key: "flow", label: "Flow" },
        { key: "channel", label: "Channel", render: (row) => row.channel === "*" ? "Any" : esc(row.channel) },
        { key: "type", label: "When", render: (row) => `${esc(typeLabel[row.type] ?? row.type)} ${matchLabel(row)}` },
        { key: "start_node_id", label: "Start", render: (row) => `<code>${esc(row.start_node_id)}</code>` },
        { key: "enabled", label: "State", render: (row) => ui.badge({ label: row.enabled ? "on" : "off", variant: row.enabled ? "success" : "neutral" }) },
        { key: "id", label: "", render: (row) => `<form method="post" action="/bot/triggers/${row.id}/delete" onsubmit="return confirm('Delete this trigger?')">${ui.button({ label: "Delete", variant: "destructive", size: "sm", type: "submit" })}</form>` },
    ], rows, empty: "No triggers yet" });

    const form = flows.length ? `<form class="asx-trigger-form asx-form" method="post" action="/bot/triggers">
        <div class="asx-trigger-form__row">
            ${ui.selector({ name: "flow", label: "Flow", value: flows[0].slug, items: flows.map((flow: any) => ({ label: flow.name, value: flow.slug, description: flow.slug })) })}
            ${ui.selector({ name: "channel", label: "Channel", value: "*", items: [{ label: "Any channel", value: "*", description: "Every connection" }, ...connections.map((row: any) => ({ label: row.name, value: row.channel, description: row.channel }))] })}
        </div>
        ${ctx.fns.bot.input({ name: "name", label: "Name", placeholder: "Start command", description: "How this trigger is listed here.", required: true })}
        ${ctx.fns.bot.input({ name: "match", label: "Match", placeholder: "/start", description: "For Command: the command without the slash. For text types: the text to compare.", required: true })}
        <label class="asx-field">
            <span class="asx-field__label-group"><span class="asx-field__label">Type</span><span class="asx-field__description">How the message is compared.</span></span>
            ${ui.segmentedControl({ name: "type", value: "command", items: [{ label: "Command", value: "command" }, { label: "Exact text", value: "text_exact" }, { label: "Contains", value: "text_contains" }] })}
        </label>
        ${ctx.fns.bot.input({ name: "start_node_id", label: "Start node", placeholder: "optional", description: "Leave empty to start at the flow's own start node." })}
        <div class="asx-trigger-form__actions">${ui.button({ label: "Create trigger", variant: "primary", type: "submit" })}</div>
    </form>` : ui.emptyState({ title: "No flows to trigger", body: "Create a flow first — a trigger names one." });

    const main = `${notice ? ui.banner({ tone: tone as any, body: notice }) : ""}${disconnected(ctx, esc)}${ui.card({ title: "New trigger", description: "A trigger decides which flow starts when a message arrives.", body: form })}${ui.card({ body: table })}`;
    return ctx.fns.bot.screen({ page: "bot-triggers", title: "Triggers", lead: "What starts a flow.", main });
}

// A trigger only fires on a channel connection its flow is linked to. Say so
// here, where someone is about to wonder why nothing happens.
function disconnected(ctx: Context, esc: (value: any) => string) {
    const ui = ctx.fns.procs.ui;
    const rows = ctx.fns.procs.db.select({
        sql: `SELECT t.name, t.channel, f.name flow FROM bot_triggers t JOIN bot_flows f ON f.id = t.bot_flow_id
              WHERE t.enabled = 1 AND NOT EXISTS (
                  SELECT 1 FROM bot_flow_connections fc JOIN bot_channel_connections c ON c.id = fc.bot_channel_connection_id
                  WHERE fc.bot_flow_id = t.bot_flow_id AND fc.enabled = 1 AND (t.channel = '*' OR c.channel = t.channel))`,
    });
    if (!rows.length) return "";
    const list = rows.map((row: any) => `<li><strong>${esc(row.name)}</strong> → ${esc(row.flow)} (${esc(row.channel === "*" ? "any channel" : row.channel)})</li>`).join("");
    return `<section class="asx-banner" data-tone="warning" data-section="bot-triggers-disconnected"><div><div class="asx-banner__title">These triggers cannot fire yet</div><div class="asx-banner__body"><ul>${list}</ul></div><div class="asx-banner__body">Their flow is not connected to the trigger's channel — open the flow and check the channel under Channels.</div></div><div class="asx-banner__actions">${ui.button({ label: "Flows", href: "/bot/flows", size: "sm" })}</div></section>`;
}
