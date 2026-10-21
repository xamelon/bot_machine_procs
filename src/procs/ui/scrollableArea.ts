export default function (ctx: Context, _session: Session | null, opts: {
    body: string; height?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-scrollable-area ${esc(opts.class ?? "")}" style="${opts.height ? `max-height:${esc(opts.height)}` : ""}" tabindex="0">${opts.body}</div>`;
}
