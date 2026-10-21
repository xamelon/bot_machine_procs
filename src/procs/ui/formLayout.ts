export default function (ctx: Context, _session: Session | null, opts: {
    body: string; columns?: 1 | 2 | 3; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-form-layout ${esc(opts.class ?? "")}" data-columns="${esc(opts.columns ?? 1)}">${opts.body}</div>`;
}
