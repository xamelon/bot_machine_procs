export default function (ctx: Context, _session: Session | null, opts: {
    body: string; minHeight?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-center ${esc(opts.class ?? "")}" style="${opts.minHeight ? `min-height:${esc(opts.minHeight)}` : ""}">${opts.body}</div>`;
}
