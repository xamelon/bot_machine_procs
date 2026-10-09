// A row of stat tiles — the caseload at a glance above a list.
//
// **It lays itself out by the column it is in, not by the window.** It used to
// say `grid-cols-2 sm:grid-cols-4`, and `sm:` is a *viewport* breakpoint: the
// portal is a phone-wide column inside a wide desktop window, so the window said
// "plenty of room" and four tiles were drawn across 390 pixels with every number
// cut off mid-digit — `151 m`, `36.6 °`. A tile row cannot know where it has
// been put, so it asks: `@container` here makes this row the thing measured, and
// the `@` variants below answer to it in the phone and in a full-width page
// alike.
export default function (ctx: Context, _session: Session | null, opts: { items: Array<{ label: string; value: string | number; sub?: string; tone?: "info" | "success" | "warning" | "danger" }>; class?: string }): string {
    return `<div class="@container ${opts.class ?? ""}">
  <div class="grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4">${opts.items.map(item => ctx.fns.procs.ui.stat(item)).join("")}</div>
</div>`;
}
