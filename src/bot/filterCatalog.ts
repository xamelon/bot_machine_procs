// UI metadata for a `$filters_<subject>` catalog. Columns stay on the server.
export default function (ctx: Context, _session: Session | null, opts: { subject: string }) {
    const subject = ctx.state.bot?.filters?.[opts.subject];
    if (!subject) return [];
    return subject.filters.map(({ column, ...meta }: any) => meta);
}
