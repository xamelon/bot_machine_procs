export default function (ctx: Context, _session: Session | null, opts: {
    title: string; body: string; open?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<details class="asx-collapsible ${esc(opts.class ?? "")}"${opts.open ? " open" : ""}><summary><span>${esc(opts.title)}</span><i class="ph ph-caret-down" aria-hidden="true"></i></summary><div class="asx-collapsible__body">${opts.body}</div></details>`;
}
