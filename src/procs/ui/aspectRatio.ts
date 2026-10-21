export default function (ctx: Context, _session: Session | null, opts: {
    body: string; ratio?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-aspect-ratio ${esc(opts.class ?? "")}" style="aspect-ratio:${esc(opts.ratio ?? "16 / 9")}">${opts.body}</div>`;
}
