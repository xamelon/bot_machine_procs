export default function (ctx: Context, _session: Session | null, opts: {
    items: Array<{ label: string; value: string }>; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const rows = opts.items.map(item => `<div class="asx-metadata-list__item"><dt class="asx-metadata-list__label">${esc(item.label)}</dt><dd class="asx-metadata-list__value">${item.value}</dd></div>`).join("");
    return `<dl class="asx-metadata-list ${esc(opts.class ?? "")}">${rows}</dl>`;
}
