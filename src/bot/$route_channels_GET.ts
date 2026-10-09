export default function (ctx: Context, _session: Session | null) {
    const rows = ctx.fns.procs.db.select({ sql: "SELECT id, channel, name, public_id, status, external_id FROM bot_channel_connections ORDER BY id" });
    const table = ctx.fns.procs.ui.table({ columns: [
        { key: "name", label: "Name" }, { key: "channel", label: "Channel" }, { key: "public_id", label: "Public id" }, { key: "status", label: "Status" },
        { key: "id", label: "", render: (row) => row.channel === "echo" ? "" : ctx.fns.procs.ui.button({ action: "provision", label: "Provision", size: "xs", post: `/bot/channels/${row.id}/provision` }) },
    ], rows, empty: "No channels" });
    const telegram = ctx.fns.procs.ui.form({ form: "telegram", post: "/bot/channels/telegram", body: `<strong>Telegram</strong>${ctx.fns.procs.ui.field({ name: "name", placeholder: "Name", required: true })}${ctx.fns.procs.ui.field({ name: "bot_token", placeholder: "Bot token", type: "password", required: true })}${ctx.fns.procs.ui.button({ action: "create-telegram", label: "Create", tone: "primary" })}` });
    const vk = ctx.fns.procs.ui.form({ form: "vk", post: "/bot/channels/vk", body: `<strong>VK</strong>${ctx.fns.procs.ui.field({ name: "name", placeholder: "Name", required: true })}${ctx.fns.procs.ui.field({ name: "group_id", placeholder: "Group ID", required: true })}${ctx.fns.procs.ui.field({ name: "group_access_token", placeholder: "Group token", type: "password", required: true })}${ctx.fns.procs.ui.button({ action: "create-vk", label: "Create", tone: "primary" })}` });
    return ctx.fns.bot.screen({ page: "bot-channels", title: "Channels", lead: "Credentials live on the connection, not in env.", main: `<div class="grid gap-6 md:grid-cols-2">${telegram}${vk}</div><div class="mt-6">${table}</div>` });
}
