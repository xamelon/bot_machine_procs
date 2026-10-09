// Backward-compatible sandbox door. Real adapters use /bot/webhook/:channel/:publicId.
export default async function (ctx: Context, _session: Session | null, opts: { req: Request; params: { channel: string } }) {
    const connection = ctx.fns.procs.db.select({
        sql: "SELECT public_id FROM bot_channel_connections WHERE channel = ? AND status = 'active' ORDER BY id LIMIT 1",
        params: [opts.params.channel],
    })[0];
    if (!connection) return new Response("connection not found", { status: 404 });
    const url = new URL(opts.req.url);
    return ctx.fns.procs.http.dispatch({ method: "POST", url: `/bot/webhook/${opts.params.channel}/${connection.public_id}${url.search}`, body: await opts.req.text(), headers: Object.fromEntries(opts.req.headers.entries()) });
}
