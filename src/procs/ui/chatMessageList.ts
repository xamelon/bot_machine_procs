export default function (ctx: Context, _session: Session | null, opts: {
    body?: string; messages?: Array<{ author?: string; body: string; time?: string; mine?: boolean; avatar?: string; status?: "sending" | "sent" | "delivered" | "read" | "error" }>;
    emptyState?: string; density?: "compact" | "balanced" | "spacious"; align?: "top" | "bottom"; gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const body = opts.body ?? (opts.messages?.map(m => ctx.fns.procs.ui.chatMessage({
        sender: m.mine ? "user" : "assistant",
        author: m.author,
        body: m.body,
        avatar: m.avatar,
        timestamp: m.time,
        status: m.status,
        density: opts.density,
    })).join("") ?? "");
    const content = body || opts.emptyState || `<div class="asx-chat-message-list__empty">No messages yet</div>`;
    return `<div class="asx-chat-message-list ${esc(opts.class ?? "")}" data-density="${esc(opts.density ?? "balanced")}" data-align="${esc(opts.align ?? "bottom")}"${opts.gap != null ? ` data-gap="${esc(opts.gap)}"` : ""}>
        <div class="asx-chat-message-list__inner">${content}</div>
    </div>`;
}
