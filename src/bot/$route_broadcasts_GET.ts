export default function (ctx: Context, session: Session | null) {
    const url = session?.req ? new URL(session.req.url) : null;
    const previewId = Number(url?.searchParams.get('preview'));
    if (previewId) return new Response(null, { status: 303, headers: { location: `/bot/broadcasts/new?preview=${previewId}` } });
    const ui = ctx.fns.procs.ui;
    const rows = ctx.fns.bot.broadcasts().map((row: any) => ({ ...row, state: row.status === 'draft' ? 'Draft' : row.pending || row.failed ? 'Sending' : 'Finished' }));
    const history = ui.table({ entity: 'broadcast', rowHref: (row: any) => `/bot/broadcasts/new?preview=${row.id}`, columns: [
        { key: 'id', label: '#' }, { key: 'connection_name', label: 'Connection' }, { key: 'state', label: 'Status' },
        { key: 'recipients', label: 'Audience' }, { key: 'sent', label: 'Sent' }, { key: 'pending', label: 'Pending' },
        { key: 'failed', label: 'Errors (retrying)' }, { key: 'skipped', label: 'Skipped' },
    ], rows, empty: 'No broadcasts yet' });
    return ctx.fns.bot.screen({ page: 'bot-broadcasts', title: 'Broadcasts', lead: 'Drafts and delivery progress.',
        right: ui.button({ label: 'New broadcast', href: '/bot/broadcasts/new', variant: 'primary', icon: 'ph-plus' }),
        main: history,
    });
}
