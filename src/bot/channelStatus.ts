// What a `bot_channel_connections` row means to a person: is a token there, is
// the webhook registered, and if it broke, why. Credentials and config live as
// JSON on the row; the adapters own their shape, so this is the one reader.
export default function (ctx: Context, _session: Session | null, opts: { row: any }) {
    const row = opts.row;
    const credentials = parse(row.credentials);
    const config = parse(row.config);
    const isVk = row.channel === "vk";
    const isMax = row.channel === "max";
    const token = isVk ? credentials.group_access_token : isMax ? credentials.access_token : credentials.bot_token;
    const webhook = config.webhook_url ?? "";
    const error = config.last_provision_error ?? "";
    return {
        row,
        isVk,
        isMax,
        echo: row.channel === "echo",
        name: row.name,
        publicId: row.public_id,
        identity: isVk ? credentials.group_id ?? row.external_id ?? "" : config.bot_username ?? row.external_id ?? "",
        tokenOk: Boolean(token),
        provisioned: Boolean(webhook) && !error,
        webhook,
        error,
        confirmation: credentials.confirmation_code ?? "",
    };
}

function parse(value: any): Record<string, any> {
    try { return JSON.parse(value || "{}"); } catch { return {}; }
}
