export default function (ctx: Context, _session: Session | null, opts: {
    href: string; label?: string; children?: string; external?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<a class="asx-link ${esc(opts.class ?? "")}" href="${esc(opts.href)}"${opts.external ? ` target="_blank" rel="noreferrer"` : ""}>${opts.children ?? esc(opts.label ?? opts.href)}</a>`;
}
