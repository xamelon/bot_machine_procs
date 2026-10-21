export default function (ctx: Context, _session: Session | null, opts: {
    body: string;
    count?: number;
    label?: string;
    collapsedSummary?: string;
    collapsed?: boolean;
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const id = `asx-chat-drawer-${Math.random().toString(36).slice(2)}`;
    const canCollapse = opts.count != null;
    const summary = opts.collapsedSummary ?? `${ctx.fns.procs.ui.badge({ label: String(opts.count ?? 0), variant: "neutral" })}<span>${esc(opts.label ?? "Items")}</span>`;
    return `<div class="asx-chat-composer-drawer ${esc(opts.class ?? "")}" data-asx-chat-drawer data-collapsed="${opts.collapsed ? "true" : "false"}">
        ${canCollapse ? `<button class="asx-chat-composer-drawer__toggle" type="button" aria-expanded="${opts.collapsed ? "false" : "true"}" aria-controls="${esc(id)}" data-asx-chat-drawer-toggle>
            <span class="asx-chat-composer-drawer__summary">${summary}</span>
            <span class="asx-chat-composer-drawer__handle" aria-hidden="true"></span>
        </button>` : ""}
        <div class="asx-chat-composer-drawer__grid" id="${esc(id)}"><div class="asx-chat-composer-drawer__content">${opts.body}</div></div>
    </div>`;
}
