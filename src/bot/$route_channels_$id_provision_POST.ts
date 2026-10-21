export default async function (ctx: Context, _session: Session | null, opts: { params: { id: string } }) {
    const row = ctx.fns.procs.db.select({ sql: "SELECT name, public_id FROM bot_channel_connections WHERE id = ?", params: [opts.params.id] })[0];
    if (!row) return back("Channel not found.", "error");
    const result = await ctx.fns.bot.provision({ publicId: row.public_id, waitMs: 0 }).catch((error: any) => ({ ok: false, error: String(error?.message ?? error) }));
    return result.ok
        ? back(`${row.name} webhook updated.`, "success")
        : back(`Provisioning ${row.name} failed: ${result.error ?? "unknown error"}`, "error");
}

function back(notice: string, tone: "success" | "error") {
    return new Response(null, { status: 303, headers: { location: `/bot/channels?notice=${encodeURIComponent(notice)}&tone=${tone}` } });
}
