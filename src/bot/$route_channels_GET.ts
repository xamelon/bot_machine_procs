export default function (ctx: Context, session: Session | null, _opts: {}) {
    const ui = ctx.fns.procs.ui;
    const esc = (s: any) => ui.escape({ text: s });
    const url = session?.req ? new URL(session.req.url) : null;
    const notice = url?.searchParams.get("notice") ?? "";
    const tone = url?.searchParams.get("tone") ?? "success";

    const rows = ctx.fns.procs.db.select({ sql: "SELECT * FROM bot_channel_connections ORDER BY id" });
    const badge = (channel: string) => ui.badge({ label: channel, variant: channel === "telegram" ? "blue" : channel === "vk" ? "purple" : channel === "max" ? "green" : "neutral" });

    const card = (row: any) => {
        const state = ctx.fns.bot.channelStatus({ row });
        const dot = (ok: boolean, on: string, off: string) => `${ui.statusDot({ tone: ok ? "success" : "warning", label: ok ? on : off })} ${esc(ok ? on : off)}`;
        const status = state.echo
            ? `<span>${ui.statusDot({ tone: "info", label: "Local sandbox" })} Local sandbox — no webhook needed</span>`
            : `<span>${dot(state.tokenOk, "Token configured", "No token")}</span><span>${dot(state.provisioned, "Webhook set", "Webhook not set")}</span>`;
        const facts = state.echo
            ? ui.metadataList({ items: [{ label: "Public id", value: `<code>${esc(state.publicId)}</code>` }] })
            : ui.metadataList({ items: [
                { label: state.isVk ? "Group ID" : "Username", value: `<code>${esc(state.identity || "—")}</code>` },
                { label: "Token", value: esc(state.tokenOk ? "configured" : "missing") },
                ...(state.confirmation ? [{ label: "Confirmation", value: `<code>${esc(state.confirmation)}</code>` }] : []),
                { label: "Public id", value: `<code>${esc(state.publicId)}</code>` },
            ] });
        const webhook = state.webhook
            ? `<p class="asx-channel__webhook"><code>${esc(state.webhook)}</code><button type="button" class="asx-button" data-variant="ghost" data-size="sm" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)"><span class="asx-button__label">Copy</span></button></p>`
            : "";
        const error = state.error ? ui.banner({ tone: "error", body: state.error }) : "";
        const provision = state.echo ? "" : `<form method="post" action="/bot/channels/${state.row.id}/provision">${ui.button({ label: state.provisioned ? "Update webhook" : "Set webhook", type: "submit" })}</form>`;
        const remove = `<form method="post" action="/bot/channels/${state.row.id}/delete" onsubmit="return confirm('Delete ${esc(state.name)}?')">${ui.button({ label: "Delete", variant: "destructive", type: "submit" })}</form>`;
        const flows = ctx.fns.bot.channelFlows({ connectionId: state.row.id });
        const served = flows.filter((flow: any) => flow.linked).length;
        const flowsForm = flows.length
            ? `<form class="asx-channel__flows asx-form" method="post" action="/bot/channels/${state.row.id}/flows"><span class="asx-field__label-group"><span class="asx-field__label">Flows</span><span class="asx-field__description">A trigger starts a flow here only if it is checked.</span></span>${ui.checkboxList({ name: "flows", values: flows.filter((flow: any) => flow.linked).map((flow: any) => flow.slug), items: flows.map((flow: any) => ({ label: flow.name, value: flow.slug, description: flow.status })) })}<div class="asx-channel__flows-actions">${ui.button({ label: served ? "Save flows" : "Connect flows", variant: "secondary", size: "sm", type: "submit" })}</div></form>`
            : `<p class="asx-channel__status">No flows yet — create one under Flows first.</p>`;
        const body = `<div class="asx-channel">
            <div class="asx-channel__status">${status}</div>
            ${facts}
            ${webhook}
            ${error}
            ${flowsForm}
            <div class="asx-channel__actions">${provision}${remove}</div>
        </div>`;
        return ui.card({ title: state.name, right: badge(row.channel), body, class: "asx-channel-card" });
    };

    const addChannel = ui.dialog({
        id: "add-channel",
        title: "Add channel",
        body: `<form class="asx-channel-form asx-form" method="post" action="/bot/channels">
            ${ui.segmentedControl({ name: "channel", value: "telegram", class: "asx-channel-form__type", items: [{ label: "Telegram", value: "telegram", icon: "ph-telegram-logo" }, { label: "VK", value: "vk", icon: "ph-users" }, { label: "MAX", value: "max", icon: "ph-chat-circle" }] })}
            ${ctx.fns.bot.input({ name: "name", label: "Name", placeholder: "Support bot", required: true })}
            <div data-asx-channel-fields="telegram">${ctx.fns.bot.input({ name: "bot_token", label: "Token", placeholder: "123:ABC", type: "password" })}</div>
            <div data-asx-channel-fields="vk">${ctx.fns.bot.input({ name: "group_id", label: "Group ID", placeholder: "Community id" })}${ctx.fns.bot.input({ name: "group_access_token", label: "Group token", placeholder: "vk1…", type: "password" })}</div>
            <div data-asx-channel-fields="max">${ctx.fns.bot.input({ name: "max_access_token", label: "Access token", placeholder: "MAX token", type: "password" })}${ctx.fns.bot.input({ name: "max_webhook_secret", label: "Webhook secret", placeholder: "optional", type: "password" })}</div>
            <div class="asx-channel-form__actions">${ui.button({ label: "Connect", variant: "primary", type: "submit" })}</div>
        </form>
        <script>
        (() => {
            const form = document.querySelector('.asx-channel-form');
            if (!form || form.dataset.wired) return;
            form.dataset.wired = '1';
            const sync = () => {
                const chosen = form.querySelector('input[name="channel"]:checked')?.value;
                form.querySelectorAll('[data-asx-channel-fields]').forEach(el => { el.hidden = el.dataset.asxChannelFields !== chosen; });
                form.querySelectorAll('[data-asx-channel-fields] input').forEach(el => { el.disabled = el.closest('[data-asx-channel-fields]').dataset.asxChannelFields !== chosen; });
            };
            form.addEventListener('change', sync);
            sync();
        })();
        </script>`,
    });

    const trigger = `<button class="asx-button" data-variant="primary" data-asx-dialog-open="add-channel" type="button"><span class="asx-button__icon"><i class="ph ph-plus" aria-hidden="true"></i></span><span class="asx-button__label">Add channel</span></button>`;
    const main = `${notice ? ui.banner({ tone: tone as any, body: notice }) : ""}${addChannel}${rows.length ? `<div class="asx-channel-grid">${rows.map(card).join("")}</div>` : ui.emptyState({ title: "No channels yet", body: "Add Telegram, VK, or MAX to start receiving messages." })}`;

    return ctx.fns.bot.screen({ page: "bot-channels", title: "Channels", lead: "Connect once. After that it is webhooks, flows, and removal.", right: trigger, main });
}
