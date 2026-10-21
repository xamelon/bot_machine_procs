export default function (ctx: Context, _session: Session | null, opts: {
    startName: string; endName: string; label?: string; start?: string; end?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-date-range ${esc(opts.class ?? "")}">${opts.label ? `<span class="asx-field__label">${esc(opts.label)}</span>` : ""}
        <div class="asx-date-range__row"><input class="asx-input" type="date" name="${esc(opts.startName)}" value="${esc(opts.start ?? "")}"><span>to</span><input class="asx-input" type="date" name="${esc(opts.endName)}" value="${esc(opts.end ?? "")}"></div>
    </div>`;
}
