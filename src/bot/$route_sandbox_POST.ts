export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const form = await opts.req.formData();
    const echo = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = 'conn_echo'" })[0];
    ctx.fns.bot.ingest({ connectionId: echo.id, idempotencyKey: `sandbox:${Date.now()}`, input: { channel: "echo", external_id: String(form.get("external_id") ?? "sandbox"), kind: "user_message", text: String(form.get("text") ?? "") } });
    try { await ctx.fns.bot.processInbox({}); } catch (error: any) {
        if (!String(error?.message ?? error).includes("already running")) throw error;
    }
    return new Response(null, { status: 303, headers: { location: "/bot/sandbox" } });
}
