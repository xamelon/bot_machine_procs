export default function (ctx: Context, _session: Session | null, opts: {
    items: Array<{ label: string; value: any }>;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return ctx.fns.procs.ui.card({
        class: "asx-stats",
        body: `<div class="asx-stats__row">${opts.items.map(item => `<div class="asx-stats__item"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></div>`).join("")}</div>`,
    });
}
