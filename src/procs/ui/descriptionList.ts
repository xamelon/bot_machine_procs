// Key/value facts about one thing — a patient, a resource. Two columns on a
// wide pane, one when narrow. `html` for a value that is a link or a badge.
export default function (ctx: Context, _session: Session | null, opts: {items: Array<{ term: string; detail?: string; html?: string; role?: string }>; cols?: 1 | 2; class?: string }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    // `@md:` and not `sm:`: the second column appears when THIS column is wide
    // enough, not when the window is — a phone-wide portal page inside a desktop
    // window used to get two columns and clip both.
    const cols = opts.cols === 1 ? "" : " @md:grid-cols-2";
    // The gap is what makes a pair read as a pair: too tight and the label of the
    // next row looks like a second line of this row's value.
    return `<div class="@container"><dl class="grid grid-cols-1 gap-x-6 gap-y-4${cols} ${opts.class ?? ""}">
  ${opts.items.map(i => `<div ${ctx.fns.procs.ui.attr({ role: i.role })}>
    <dt class="text-xs text-base-content/60">${esc(i.term)}</dt>
    <dd class="mt-0.5 text-sm text-base-content">${i.html ?? (esc(i.detail) || "—")}</dd>
  </div>`).join("")}
</dl></div>`;
}
