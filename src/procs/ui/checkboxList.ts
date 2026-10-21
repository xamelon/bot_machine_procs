export default function (ctx: Context, _session: Session | null, opts: {
    name: string; values?: string[]; items: Array<{ label: string; value: string; description?: string; disabled?: boolean }>; class?: string;
}) {
    const selected = new Set(opts.values ?? []);
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-checkbox-list ${esc(opts.class ?? "")}">${opts.items.map(i => ctx.fns.procs.ui.checkboxInput({ name: opts.name, label: i.label, description: i.description, value: i.value, checked: selected.has(i.value), disabled: i.disabled })).join("")}</div>`;
}
