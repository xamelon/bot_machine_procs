export default function (ctx: Context, _session: Session | null, opts: {
    timestamp?: string; footer?: string; status?: "sending" | "sent" | "delivered" | "read" | "error"; mine?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const statusIcon = opts.status === "sending" ? "ph-clock" : opts.status === "sent" ? "ph-check" : opts.status === "delivered" ? "ph-checks" : opts.status === "read" ? "ph-checks" : opts.status === "error" ? "ph-warning-circle" : "";
    const parts = [
        opts.timestamp ? `<span>${esc(opts.timestamp)}</span>` : "",
        opts.footer ? `<span>${esc(opts.footer)}</span>` : "",
        opts.status ? `<span class="asx-chat-message-metadata__status" data-status="${esc(opts.status)}">${statusIcon ? `<i class="ph ${statusIcon}" aria-hidden="true"></i>` : ""}${esc(opts.status)}</span>` : "",
    ].filter(Boolean).join(`<span class="asx-chat-message-metadata__sep">·</span>`);
    return `<div class="asx-chat-message-metadata ${esc(opts.class ?? "")}" data-mine="${opts.mine ? "true" : "false"}">${parts}</div>`;
}
