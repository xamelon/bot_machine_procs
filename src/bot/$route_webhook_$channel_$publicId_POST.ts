export default async function (ctx: Context, _session: Session | null, opts: { req: Request; params: { channel: string; publicId: string } }) {
    const connection = ctx.fns.procs.db.select({
        sql: "SELECT * FROM bot_channel_connections WHERE channel = ? AND public_id = ? AND status = 'active'",
        params: [opts.params.channel, opts.params.publicId],
    })[0];
    if (!connection) return new Response("connection not found", { status: 404 });

    let body: any;
    const text = await opts.req.text();
    try { body = text ? JSON.parse(text) : {}; }
    catch { return new Response("bad json", { status: 400 }); }

    const parsed = await ctx.fns.procs.hooks.first({
        name: `bot.adapter.${connection.channel}`,
        opts: { phase: "parse", req: opts.req, body, channel: connection.channel, connection: unpack(connection) },
    });
    if (!parsed) return new Response("unknown channel", { status: 404 });
    if (parsed.response instanceof Response) return parsed.response;
    if (parsed.status && parsed.body != null) return new Response(parsed.body, { status: parsed.status });
    if (!parsed.input) return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200, headers: { "content-type": "application/json" } });

    const queued = ctx.fns.bot.ingest({ input: { ...parsed.input, channel: connection.channel }, connectionId: connection.id, idempotencyKey: parsed.idempotencyKey });
    return new Response(JSON.stringify({ ok: true, queued: queued.inserted }), { status: 202, headers: { "content-type": "application/json" } });
}

function unpack(row: any) {
    return { ...row, credentials: JSON.parse(row.credentials || "{}"), config: JSON.parse(row.config || "{}") };
}
