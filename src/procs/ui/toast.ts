export default function (ctx: Context, _session: Session | null, opts: {
    id?: string; label?: string; message: string; type?: "info" | "success" | "error"; action?: string; autoHide?: number; trigger?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/toast.js" });
    const id = opts.id ?? "asx-toast";
    const trigger = opts.trigger ?? ctx.fns.procs.ui.button({ label: opts.label ?? "Show toast", variant: "secondary" });
    return `<span data-asx-toast-trigger data-message="${esc(opts.message)}" data-type="${esc(opts.type ?? "info")}" data-autohide="${esc(opts.autoHide ?? 4500)}" data-action-label="${esc(opts.action ?? "")}">${trigger}</span><div id="${esc(id)}" class="asx-toast-viewport ${esc(opts.class ?? "")}" data-asx-toast-viewport></div><script src="${esc(src)}" defer></script>`;
}
