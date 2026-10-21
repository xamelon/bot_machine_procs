export default function (ctx: Context, _session: Session | null, opts: {
    body?: string; children?: string; sender?: "user" | "assistant" | "system"; author?: string; avatar?: string; timestamp?: string; status?: "sending" | "sent" | "delivered" | "read" | "error"; metadata?: string; variant?: "filled" | "ghost"; width?: string; density?: "compact" | "balanced" | "spacious"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const sender = opts.sender ?? "assistant";
    if (sender === "system") return ctx.fns.procs.ui.chatSystemMessage({ body: opts.body ?? opts.children ?? "", class: opts.class });
    const mine = sender === "user";
    const avatar = opts.avatar !== "none" ? ctx.fns.procs.ui.avatar({ name: opts.author ?? sender, src: opts.avatar, size: "sm" }) : "";
    const metadata = opts.metadata ?? ctx.fns.procs.ui.chatMessageMetadata({ timestamp: opts.timestamp, status: opts.status, mine });
    const content = opts.children ?? ctx.fns.procs.ui.chatMessageBubble({ body: opts.body ?? "", name: opts.author, metadata, mine, variant: opts.variant, width: opts.width });
    return `<div class="asx-chat-message ${esc(opts.class ?? "")}" data-sender="${esc(sender)}" data-density="${esc(opts.density ?? "balanced")}">
        ${avatar ? `<div class="asx-chat-message__avatar">${avatar}</div>` : ""}
        <div class="asx-chat-message__content">${content}</div>
    </div>`;
}
