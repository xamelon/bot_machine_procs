export default function (ctx: Context, _session: Session | null, opts: {
    label: string;
    value?: string;
    variant?: string;
    icon?: string;
    class?: string;
}) {
    return `<span class="asx-chat-composer-token-element ${ctx.fns.procs.ui.escape({ text: opts.class ?? "" })}">${ctx.fns.procs.ui.badge({ label: opts.label, variant: opts.variant as any, icon: opts.icon })}</span>`;
}
