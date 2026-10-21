export default function (ctx: Context, _session: Session | null, opts: { code: string; language?: string; class?: string }) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<figure class="asx-code-figure ${esc(opts.class ?? "")}">${opts.language ? `<figcaption>${esc(opts.language)}</figcaption>` : ""}<pre class="asx-code-block"><code>${esc(opts.code)}</code></pre></figure>`;
}
