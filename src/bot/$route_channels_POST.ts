import { randomBytes } from "node:crypto";

// Create a connection and provision it in the same step — a channel that is not
// registered with its platform is a row that looks fine and receives nothing.
export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const form = await opts.req.formData();
    const field = (name: string) => String(form.get(name) ?? "").trim();
    const chosen = field("channel");
    const channel = chosen === "vk" ? "vk" : chosen === "max" ? "max" : "telegram";
    const name = field("name");
    const credentials = channel === "vk"
        ? { group_id: field("group_id"), group_access_token: field("group_access_token") }
        : channel === "max"
            ? { access_token: field("max_access_token"), webhook_secret: field("max_webhook_secret") }
            : { bot_token: field("bot_token") };
    const missing = !name || !Object.entries(credentials).filter(([key]) => key !== "webhook_secret").every(([, value]) => value);
    if (missing) return back(`Name and credentials are required for ${channel}.`, "error");

    const publicId = "conn_" + randomBytes(4).toString("hex");
    ctx.fns.bot.saveConnection({ channel, name, publicId, externalId: channel === "vk" ? credentials.group_id : null, credentials });
    const result = await ctx.fns.bot.provision({ publicId }).catch((error: any) => ({ ok: false, error: String(error?.message ?? error) }));
    return result.ok
        ? back(`${name} connected.`, "success")
        : back(`${name} saved, but provisioning failed: ${result.error ?? "unknown error"}`, "error");
}

function back(notice: string, tone: "success" | "error") {
    return new Response(null, { status: 303, headers: { location: `/bot/channels?notice=${encodeURIComponent(notice)}&tone=${tone}` } });
}
