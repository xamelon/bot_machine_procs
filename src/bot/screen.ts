export default function (ctx: Context, _session: Session | null, opts: { page: string; title: string; lead?: string; main: string; right?: string; back?: string; backLabel?: string }) {
    return { title: opts.title, main: ctx.fns.procs.ui.page(opts) };
}
