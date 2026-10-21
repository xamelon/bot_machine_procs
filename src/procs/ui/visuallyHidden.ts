export default function (ctx: Context, _session: Session | null, opts: { text?: string; children?: string; class?: string }) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<span class="asx-visually-hidden ${esc(opts.class ?? "")}">${opts.children ?? esc(opts.text ?? "")}</span>`;
}
