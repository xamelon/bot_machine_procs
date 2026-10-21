export default function (ctx: Context, _session: Session | null, opts: {
    body: string; icon?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-chat-system-message ${esc(opts.class ?? "")}">${opts.icon ? `<i class="ph ${esc(opts.icon)}" aria-hidden="true"></i>` : ""}<span>${esc(opts.body)}</span></div>`;
}
