export default async function (ctx: Context, _session: Session | null, opts: { params: { id: string } }) {
    const row = ctx.fns.procs.db.select({ sql: "SELECT public_id FROM bot_channel_connections WHERE id = ?", params: [opts.params.id] })[0];
    if (!row) return new Response("not found", { status: 404 });
    const result = await ctx.fns.bot.provision({ publicId: row.public_id, waitMs: 0 });
    return ctx.fns.bot.screen({ page: "bot-channels", title: "Channels", main: ctx.fns.procs.ui.notice({ tone: result.ok ? "success" : "danger", text: result.ok ? "Provisioned" : String(result.error ?? "failed") }) });
}
