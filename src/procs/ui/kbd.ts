export default function (ctx: Context, _session: Session | null, opts: { label: string; class?: string }) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<kbd class="asx-kbd ${esc(opts.class ?? "")}">${esc(opts.label)}</kbd>`;
}
