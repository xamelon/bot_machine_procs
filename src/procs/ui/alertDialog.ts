export default function (ctx: Context, _session: Session | null, opts: {
    id: string; title: string; body: string; trigger: string; confirmLabel?: string; cancelLabel?: string; tone?: "error" | "warning" | "accent"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return ctx.fns.procs.ui.dialog({ id: opts.id, title: opts.title, body: `<div class="asx-alert-dialog" data-tone="${esc(opts.tone ?? "error")}">${opts.body}</div>`, trigger: opts.trigger, purpose: "form", class: opts.class, actions: `<button class="asx-button" data-variant="ghost" data-size="md" type="button" data-asx-dialog-close>${esc(opts.cancelLabel ?? "Cancel")}</button>${ctx.fns.procs.ui.button({ label: opts.confirmLabel ?? "Confirm", variant: opts.tone === "warning" ? "secondary" : "destructive" })}` });
}
