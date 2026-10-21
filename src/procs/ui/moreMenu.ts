export default function (ctx: Context, session: Session | null, opts: {
    items: Array<{ label?: string; description?: string; icon?: string; href?: string; action?: string; danger?: boolean; disabled?: boolean; divider?: boolean; checked?: boolean; type?: "item" | "checkbox" | "radio"; name?: string; value?: string; items?: Array<{ label: string; icon?: string; danger?: boolean; disabled?: boolean }> }>; label?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const label = opts.label ?? "More";
    const trigger = `<button class="asx-button asx-icon-button" data-variant="ghost" data-size="md" type="button" data-asx-menu-trigger aria-haspopup="menu" aria-expanded="false" aria-label="${esc(label)}"><span class="asx-button__icon"><i class="ph ph-dots-three" aria-hidden="true"></i></span></button>`;
    return ctx.fns.procs.ui.dropdownMenu({ trigger, items: opts.items, class: opts.class });
}
