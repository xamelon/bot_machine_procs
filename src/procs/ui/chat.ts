export default function (ctx: Context, _session: Session | null, opts: {
    messages: Array<{ author: string; body: string; time?: string; mine?: boolean; avatar?: string; status?: "sending" | "sent" | "delivered" | "read" | "error" }>;
    composer?: string; class?: string;
}) {
    const list = ctx.fns.procs.ui.chatMessageList({ messages: opts.messages });
    if (opts.composer) return ctx.fns.procs.ui.chatLayout({ body: list, composer: opts.composer, class: opts.class });
    return `<div class="asx-chat ${ctx.fns.procs.ui.escape({ text: opts.class ?? "" })}">${list}</div>`;
}
