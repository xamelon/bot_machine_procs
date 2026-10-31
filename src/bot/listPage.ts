// Server-side pagination for trusted internal SQL fragments. Values stay bound.
export default function (ctx: Context, session: Session | null, opts: { from: string; where?: string; params?: any[]; href: string }) {
    const url = new URL(session?.req?.url ?? `http://localhost${opts.href}`);
    const raw = Number(url.searchParams.get('page') || 1);
    const size = 20;
    const count = Number(ctx.fns.procs.db.select({ sql: `SELECT COUNT(*) AS total FROM ${opts.from} WHERE ${opts.where || '1=1'}`, params: opts.params ?? [] })[0].total);
    const total = Math.max(1, Math.ceil(count / size));
    const page = Math.min(total, Number.isSafeInteger(raw) && raw > 0 ? raw : 1);
    url.searchParams.delete('page');
    const query = url.searchParams.toString();
    const pager = ctx.fns.procs.ui.pagination({ page, total, href: opts.href + (query ? '?' + query : '') });
    return { size, offset: (page - 1) * size, page, count, pager };
}
