// A suggested answer, as a pill under a question. Pressed, it is sent as the
// person's own words (the htmx wiring is the caller's); held for a moment, it
// fills from the left and then drops its words into the box instead, to be
// edited and sent by hand — `suggest.js` does the holding and raises
// `suggest-hold` on the pill, and whoever owns the box listens for that.
//
// The recommendation is a tag beside the words, never a filled pill: a filled
// pill reads as "already chosen", and then nobody presses it. The tag is what
// gives way when the column is narrow (`data-role` marks are for the client's
// `fitTags`), and the whole answer rides on the pointer as the kit's tooltip.
export default function (ctx: Context, _session: Session | null, opts: { label: string; recommended?: boolean; post?: string; vals?: string; target?: string; swap?: string; sync?: string }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const hx = opts.post
        ? ` hx-post="${esc(opts.post)}"${opts.vals ? ` hx-vals="${esc(opts.vals)}"` : ""}${opts.target ? ` hx-target="${esc(opts.target)}"` : ""}${opts.swap ? ` hx-swap="${esc(opts.swap)}"` : ""}${opts.sync ? ` hx-sync="${esc(opts.sync)}"` : ""}`
        : "";
    const tag = opts.recommended
        ? `<span class="badge badge-xs badge-primary ml-1 max-w-full shrink-0 align-middle" data-tip="recommended" ${ctx.fns.procs.ui.attr({ role: "tag" })}><span class="@3xs:hidden">★</span><span class="@3xs:inline-block hidden max-w-full truncate align-bottom" ${ctx.fns.procs.ui.attr({ role: "tag-word" })}>recommended</span></span>`
        : "";
    return `<button type="button" class="ui-suggest ui-focusable @3xs:block${opts.recommended ? " is-recommended" : ""}" data-tip="${esc(opts.label)}" data-text="${esc(opts.label)}" title="Hold to edit before sending"
  ${ctx.fns.procs.ui.attr({ action: "suggest", id: opts.label })}${hx}
  ><span class="@3xs:inline @3xs:overflow-visible @3xs:whitespace-normal min-w-0 truncate" ${ctx.fns.procs.ui.attr({ role: "answer" })}>${esc(opts.label)}</span>${tag}</button>`;
}
