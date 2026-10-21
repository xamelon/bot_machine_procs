export default function (ctx: Context, _session: Session | null, opts: {
    title: string; body?: string; icon?: string; action?: string; compact?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<div class="asx-empty-state ${esc(opts.class ?? "")}"${opts.compact ? ` data-compact="true"` : ""}>
        ${opts.icon ? `<div class="asx-empty-state__icon"><i class="ph ${esc(opts.icon)}" aria-hidden="true"></i></div>` : ""}
        <div class="asx-empty-state__title">${esc(opts.title)}</div>
        ${opts.body ? `<div class="asx-empty-state__body">${esc(opts.body)}</div>` : ""}
        ${opts.action ? `<div class="asx-empty-state__action">${opts.action}</div>` : ""}
    </div>`;
}
