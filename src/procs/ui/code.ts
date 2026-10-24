export default function (ctx: Context, _session: Session | null, opts: {
    code: string; block?: boolean; wrap?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return opts.block ? `<pre class="asx-code-block ${esc(opts.class ?? "")}"${opts.wrap ? ' data-wrap="true"' : ""}><code>${esc(opts.code)}</code></pre>` : `<code class="asx-code ${esc(opts.class ?? "")}">${esc(opts.code)}</code>`;
}
