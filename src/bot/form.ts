// Compatibility entry for bot pages; the shared UI owns form rendering.
export default function (ctx: Context, _session: Session | null, opts: {
    form?: string; post?: string; get?: string; push?: boolean; class?: string; body: string; id?: string;
}) {
    return ctx.fns.procs.ui.form(opts);
}
