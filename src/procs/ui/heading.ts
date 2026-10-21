export default function (ctx: Context, _session: Session | null, opts: {
    text?: string; children?: string; level?: 1 | 2 | 3 | 4; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const level = opts.level ?? 2;
    return `<h${level} class="asx-heading ${esc(opts.class ?? "")}" data-level="${level}">${opts.children ?? esc(opts.text ?? "")}</h${level}>`;
}
