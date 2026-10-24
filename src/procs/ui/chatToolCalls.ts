// Astryx-style inline tool activity; output expands below the quiet status row.
export default function (ctx: Context, _session: Session | null, opts: {
    calls: Array<{ name: string; status?: "pending" | "running" | "complete" | "error"; target?: string; duration?: string; argumentsDetail?: string; resultDetail?: string; errorMessage?: string }>;
    class?: string; batch?: boolean; defaultIsExpanded?: boolean; label?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const icon = (s?: string) => s === "running" ? "ph-circle-notch" : s === "error" ? "ph-warning-circle" : s === "pending" ? "ph-clock" : "ph-check-circle";
    const labels = { pending: "Waiting", running: "Running", complete: "Done", error: "Failed" };
    const rows = opts.calls.map(c => {
        const status = c.status ?? "complete";
        const result = c.errorMessage ?? c.resultDetail;
        return `<details class="asx-chat-tool-call" data-status="${esc(status)}">
            <summary class="asx-chat-tool-call__summary">
                <i class="ph ${icon(status)}" data-tool-icon aria-hidden="true"></i>
                <span class="asx-chat-tool-call__main"><strong data-tool-name>${esc(c.name)}</strong><small data-tool-target${c.target ? "" : " hidden"}>${esc(c.target ?? "")}</small></span>
                <span class="asx-chat-tool-call__meta"><span data-tool-status class="asx-visually-hidden">${labels[status]}</span><span class="asx-chat-tool-call__duration" data-tool-duration${c.duration ? "" : " hidden"}>${esc(c.duration ?? "")}</span></span>
                <i class="ph ph-caret-down asx-chat-tool-call__chevron" aria-hidden="true"></i>
            </summary>
            <div class="asx-chat-tool-call__detail">
                <section data-tool-arguments${c.argumentsDetail ? "" : " hidden"}><strong>Arguments</strong><pre>${esc(c.argumentsDetail ?? "")}</pre></section>
                <section data-tool-result${result ? "" : " hidden"}><strong>Result</strong><pre>${esc(result ?? "")}</pre></section>
            </div>
        </details>`;
    }).join("");
    if (opts.batch ?? opts.calls.length > 1) {
        const count = opts.calls.length;
        const label = opts.label ?? `${count} ${count === 1 ? "tool" : "tools"} called`;
        return `<details class="asx-chat-tool-calls asx-chat-tool-group ${esc(opts.class ?? "")}" data-tool-batch${opts.defaultIsExpanded ? " open" : ""}>
            <summary class="asx-chat-tool-group__summary"><i class="ph ph-caret-right" aria-hidden="true"></i><span data-tool-batch-label>${esc(label)}</span></summary>
            <div class="asx-chat-tool-group__list" data-tool-batch-list>${rows}</div>
        </details>`;
    }
    return `<div class="asx-chat-tool-calls ${esc(opts.class ?? "")}">${rows}</div>`;
}
