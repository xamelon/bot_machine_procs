export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const origin = opts.req.headers.get('origin');
    const host = opts.req.headers.get('host') ?? new URL(opts.req.url).host;
    if (origin && origin !== `http://${host}` && origin !== `https://${host}`) return new Response('Forbidden', { status: 403 });
    const form = await opts.req.formData();
    const values = { connectionId: String(form.get('connection_id') ?? ''), text: String(form.get('text') ?? ''), q: String(form.get('q') ?? ''), tree: { all: [] } as any };
    try {
        values.tree = JSON.parse(String(form.get('filters') ?? '{"all":[]}'));
        const result = ctx.fns.bot.createBroadcast({ connectionId: Number(values.connectionId), text: values.text, tree: values.tree, q: values.q });
        return new Response(null, { status: 303, headers: { location: `/bot/broadcasts/new?preview=${result.id}` } });
    } catch (error: any) {
        return { ...ctx.fns.bot.broadcastPage({ values, error: String(error?.message ?? error) }), status: 400 };
    }
}
