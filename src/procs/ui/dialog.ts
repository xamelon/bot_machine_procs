// A modal, JS-free — the HTML Popover API. A trigger button opens the [popover],
// which sits centred over a dimmed page; clicking outside or the × closes it.
// For a confirm, a form, a detail peek.
// **Its own panel, not daisyUI's `modal-box`.** That class is written for a
// `.modal` parent that toggles it: standing on its own it is `opacity: 0` and
// `scale: .95` for ever, so the dialog opened, dimmed the page behind it and
// showed nothing at all. `.ui-dialog` in the framework's stylesheet is the whole
// panel — width, border, radius, shadow — and it is ours to keep true.
// The trigger is `ui.button`, so a dialog can be opened by a worded button or —
// with `icon` — by the same quiet glyph a toolbar is made of, with the label in
// its tooltip. One control, not a second one that merely looks like it.
// **The trigger is optional.** Anything that can carry `popovertarget` opens a
// dialog — a row of the kit's own menu, for one — and a dialog that insists on
// drawing its own button leaves that caller with two controls for one act.
export default function (ctx: Context, _session: Session | null, opts: {id: string; trigger?: { label: string; icon?: string; tone?: "default" | "primary" | "danger"; tip?: "top" | "bottom" | "left" | "right" }; title: string; body: string; actions?: string }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<span>
  ${opts.trigger ? ctx.fns.procs.ui.button({ action: `open-${opts.id}`, label: opts.trigger.label, icon: opts.trigger.icon, tone: opts.trigger.tone, tip: opts.trigger.tip, popover: opts.id }) : ""}
  <div id="${esc(opts.id)}" popover class="ui-dialog" role="dialog" aria-modal="true" aria-label="${esc(opts.title)}">
    <div class="border-base-300 flex items-start justify-between gap-4 border-b px-5 py-3">
      <h2 class="text-base font-semibold">${esc(opts.title)}</h2>
      <button type="button" class="btn btn-sm btn-circle btn-ghost" popovertarget="${esc(opts.id)}" popovertargetaction="hide" aria-label="Close"><i class="ph ph-x" aria-hidden="true"></i></button>
    </div>
    <div class="px-5 py-4">${opts.body}</div>
    ${opts.actions ? `<div class="border-base-300 bg-base-200 flex justify-end gap-2 border-t px-5 py-3">${opts.actions}</div>` : ""}
  </div>
</span>`;
}
