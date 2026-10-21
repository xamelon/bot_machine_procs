export default function (ctx: Context, _session: Session | null, opts: { params: { id: string } }) {
    const row = ctx.fns.procs.db.select({ sql: "SELECT name FROM bot_channel_connections WHERE id = ?", params: [opts.params.id] })[0];
    if (!row) return back("Channel not found.", "error");
    ctx.fns.procs.db.run({ sql: "DELETE FROM bot_channel_connections WHERE id = ?", params: [opts.params.id] });
    return back(`${row.name} removed.`, "success");
}

function back(notice: string, tone: "success" | "error") {
    return new Response(null, { status: 303, headers: { location: `/bot/channels?notice=${encodeURIComponent(notice)}&tone=${tone}` } });
}
