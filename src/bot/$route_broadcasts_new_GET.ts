export default function (ctx: Context, session: Session | null) {
    const url = session?.req ? new URL(session.req.url) : null;
    return ctx.fns.bot.broadcastPage({ previewId: Number(url?.searchParams.get('preview')) || undefined });
}
