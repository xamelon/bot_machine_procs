export default function (ctx: Context, _session: Session | null, opts: {
    label: string; value?: string; removable?: boolean; selected?: boolean; icon?: string; class?: string;
    attrs?: string; removeAttrs?: string; labelHtml?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const label = opts.labelHtml ?? esc(opts.label);
    return `<span class="asx-token ${esc(opts.class ?? "")}"${opts.selected ? ` data-selected="true"` : ""}${opts.attrs ? ` ${opts.attrs}` : ""}>${opts.icon ? `<i class="ph ${esc(opts.icon)}" aria-hidden="true"></i>` : ""}<span class="asx-token__label">${label}</span>${opts.value ? `<strong>${esc(opts.value)}</strong>` : ""}${opts.removable ? `<button class="asx-token__remove" type="button" aria-label="Remove ${esc(opts.label)}"${opts.removeAttrs ? ` ${opts.removeAttrs}` : ""}>×</button>` : ""}</span>`;
}
