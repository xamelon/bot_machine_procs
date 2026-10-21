export default function (ctx: Context, _session: Session | null, opts: {
    body: string; orientation?: "horizontal" | "vertical"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-button-group ${esc(opts.class ?? "")}" data-orientation="${esc(opts.orientation ?? "horizontal")}" role="group">${opts.body}</div>`;
}
