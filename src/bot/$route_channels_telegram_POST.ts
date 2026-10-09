import { randomBytes } from "node:crypto";

export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const form = await opts.req.formData();
    ctx.fns.bot.saveConnection({ channel: "telegram", name: String(form.get("name") ?? "Telegram"), publicId: "conn_" + randomBytes(4).toString("hex"), credentials: { bot_token: String(form.get("bot_token") ?? "") } });
    return new Response(null, { status: 303, headers: { location: "/bot/channels" } });
}
