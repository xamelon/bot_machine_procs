export default function (ctx: Context, _session: Session | null, opts: {
    calls: Array<{ name: string; status?: "pending" | "running" | "complete" | "error"; target?: string; duration?: string; resultDetail?: string; errorMessage?: string }>;
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const icon = (s?: string) => s === "running" ? "ph-circle-notch" : s === "error" ? "ph-warning-circle" : s === "pending" ? "ph-clock" : "ph-check-circle";
    const rows = opts.calls.map(c => `<div class="asx-chat-tool-call" data-status="${esc(c.status ?? "complete")}">
        <i class="ph ${icon(c.status)}" aria-hidden="true"></i>
        <span class="asx-chat-tool-call__main"><strong>${esc(c.name)}</strong>${c.target ? `<small>${esc(c.target)}</small>` : ""}</span>
        ${c.duration ? `<span class="asx-chat-tool-call__duration">${esc(c.duration)}</span>` : ""}
        ${c.errorMessage || c.resultDetail ? `<div class="asx-chat-tool-call__detail">${esc(c.errorMessage ?? c.resultDetail)}</div>` : ""}
    </div>`).join("");
    return `<div class="asx-chat-tool-calls ${esc(opts.class ?? "")}">${rows}</div>`;
}
