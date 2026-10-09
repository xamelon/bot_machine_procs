// Something that just happened and is over: the clock was put back, a step was
// done, a person was put on a pathway. A `ui.notice` is for what the person
// must still read — it stays in the page, above the thing it is about. A toast
// is for what only needs to be acknowledged: it rises at the bottom centre,
// sits for three seconds, and is gone; a × sends it away sooner. Rendered
// inline wherever the page puts it — `$script_toast.js` lifts it into the one
// fixed stack on `hyper-load`, so a fragment never worries where the corner is.
// It carries `data-role="toast"` and `data-tone` like a notice, so an agent
// that pressed a button reads the outcome off it the same way.
// A solid fill in the tone's colour, the text in that tone's own `-content`
// ink — a toast is not paper on the page but a chip laid over it, and it is
// read in a glance from the corner of the eye, which is what the fill is for.
const TONE = {
    info: "bg-info text-info-content", success: "bg-success text-success-content",
    warning: "bg-warning text-warning-content", error: "bg-error text-error-content",
} as const;
const MARK = { info: "ph-info", success: "ph-check-circle", warning: "ph-warning", error: "ph-warning-octagon" } as const;

export default function (ctx: Context, _session: Session | null, opts: { text: string; tone?: keyof typeof TONE; ms?: number }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const tone = opts.tone ?? "info";
    return `<div class="ui-toast flex items-start gap-2.5 rounded-md px-4 py-3 text-sm shadow-lg ${TONE[tone]}"
  ${ctx.fns.procs.ui.attr({ role: "toast" })} data-tone="${tone}" role="status"
  hx-on:hyper-load="window.toast.show(this, ${Number(opts.ms ?? 3000)})">
  <i class="ph ${MARK[tone]} mt-0.5 shrink-0 text-base" aria-hidden="true"></i>
  <span class="min-w-0 flex-1">${esc(opts.text)}</span>
  <button type="button" class="ui-focusable opacity-60 hover:opacity-100 -mr-1 -mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded" aria-label="Dismiss"
    ${ctx.fns.procs.ui.attr({ action: "dismiss" })} hx-on:click="window.toast.hide(this.parentElement)"><i class="ph ph-x" aria-hidden="true"></i></button>
</div>`;
}
