export default function (ctx: Context, _session: Session | null, opts: { quote: string; cite?: string; class?: string }) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<blockquote class="asx-blockquote ${esc(opts.class ?? "")}"><p>${esc(opts.quote)}</p>${opts.cite ? `<cite>${esc(opts.cite)}</cite>` : ""}</blockquote>`;
}
