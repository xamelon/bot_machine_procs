export default function (ctx: Context, _session: Session | null, opts: {
    title?: string; start?: string; center?: string; end?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<header class="asx-top-nav ${esc(opts.class ?? "")}"><div class="asx-top-nav__start">${opts.start ?? ""}${opts.title ? `<strong>${esc(opts.title)}</strong>` : ""}</div>${opts.center ? `<div class="asx-top-nav__center">${opts.center}</div>` : ""}<div class="asx-top-nav__end">${opts.end ?? ""}</div></header>`;
}
