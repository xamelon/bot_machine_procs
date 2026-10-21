export default function (ctx: Context, _session: Session | null, opts: {
    side?: string; top?: string; main: string; mobile?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-app-shell ${esc(opts.class ?? "")}">${opts.side ?? ""}<div class="asx-app-shell__body">${opts.top ?? ""}<main class="asx-app-shell__main">${opts.main}</main></div>${opts.mobile ?? ""}</div>`;
}
