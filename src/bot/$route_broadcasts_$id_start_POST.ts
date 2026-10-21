export default async function (ctx: Context, _session: Session | null, opts: { req: Request; params: { id: string } }) {
    const origin = opts.req.headers.get('origin');
    const host = opts.req.headers.get('host') ?? new URL(opts.req.url).host;
    if (origin && origin !== `http://${host}` && origin !== `https://${host}`) return new Response('Forbidden', { status: 403 });
    const form = await opts.req.formData();
    if (form.get('confirm') !== 'yes') return new Response('Confirmation required', { status: 400 });
    try {
        const result = ctx.fns.bot.startBroadcast({ id: Number(opts.params.id) });
        return new Response(null, { status: 303, headers: { location: `/bot/broadcasts/new?preview=${result.id}` } });
    } catch (error: any) {
        return { ...ctx.fns.bot.broadcastPage({ previewId: Number(opts.params.id), error: String(error?.message ?? error) }), status: 400 };
    }
}
