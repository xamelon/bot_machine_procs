export default function (ctx: Context, _session: Session | null, opts: {
    control: string; start?: string; end?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-input-group ${esc(opts.class ?? "")}">${opts.start ? `<span class="asx-input-group__addon">${opts.start}</span>` : ""}${opts.control}${opts.end ? `<span class="asx-input-group__addon">${opts.end}</span>` : ""}</div>`;
}
