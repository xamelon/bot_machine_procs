export default function (ctx: Context, _session: Session | null, opts: {
    id: string; title?: string; body: string; trigger?: string; actions?: string; width?: string; fullscreen?: boolean; purpose?: "info" | "form" | "required"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/dialog.js" });
    const trigger = opts.trigger ? `<span data-asx-dialog-open="${esc(opts.id)}">${opts.trigger}</span>` : "";
    const close = opts.purpose === "required" ? "" : `<button class="asx-icon-button asx-dialog__close" data-variant="ghost" data-size="sm" type="button" data-asx-dialog-close aria-label="Close"><i class="ph ph-x" aria-hidden="true"></i></button>`;
    return `${trigger}<dialog id="${esc(opts.id)}" class="asx-dialog ${esc(opts.class ?? "")}" data-purpose="${esc(opts.purpose ?? "info")}"${opts.fullscreen ? ` data-fullscreen="true"` : ""} style="${opts.width ? `--asx-dialog-width:${esc(opts.width)}` : ""}">
        <div class="asx-dialog__surface">
            <header class="asx-dialog__header">${opts.title ? `<h2 class="asx-dialog__title">${esc(opts.title)}</h2>` : "<span></span>"}${close}</header>
            <div class="asx-dialog__body">${opts.body}</div>
            ${opts.actions ? `<footer class="asx-dialog__actions">${opts.actions}</footer>` : ""}
        </div>
    </dialog><script src="${esc(src)}" defer></script>`;
}
