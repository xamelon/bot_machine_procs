import { randomBytes } from "node:crypto";

export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const form = await opts.req.formData();
    const groupId = String(form.get("group_id") ?? "");
    ctx.fns.bot.saveConnection({ channel: "vk", name: String(form.get("name") ?? "VK"), publicId: "conn_" + randomBytes(4).toString("hex"), externalId: groupId, credentials: { group_id: groupId, group_access_token: String(form.get("group_access_token") ?? "") } });
    return new Response(null, { status: 303, headers: { location: "/bot/channels" } });
}
