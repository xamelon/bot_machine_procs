export default function (ctx: Context, _session: Session | null, opts: { params: { id: string }; req: Request }) {
    const user = ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_users WHERE id = ?', params: [opts.params.id] })[0];
    if (!user) return new Response('User not found', { status: 404 });
    let before: any;
    try {
        before = JSON.parse(new URL(opts.req.url).searchParams.get('before') || 'null');
        if (!before || typeof before.at !== 'string' || before.at.length > 40 || !['in', 'out'].includes(before.direction) || !Number.isSafeInteger(before.id) || before.id < 1) throw new Error();
    } catch { return new Response('Invalid history cursor', { status: 400 }); }
    return new Response(ctx.fns.bot.userChat({ user, before }), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
