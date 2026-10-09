// The shell every module page starts with: the one element that carries
// `data-page`, the heading, and the sentence under it. Going through here is
// what makes a page addressable at all — the workspace looks for exactly one
// data-page to know what it is showing, and a page that forgets it cannot be
// pointed at, toured or reported by page.state.
// `right` is what belongs TO the heading rather than to the page under it — a
// help button, a switch over the whole screen. `ui.box` calls the same slot the
// same thing.
//
// `back` is the way out of a page somebody came INTO — a url, and a slot of its
// own because a way back has one place in every product ever made: to the LEFT
// of the title, pointing at what it returns to. A page that had to draw its own
// had nowhere to put it but `right`, and it landed after the last letter of the
// heading as an arrow pointing back at the words it followed.
//
// `count` is how many of the thing the page is about there are. It belongs
// beside the heading, in the grey pill every list in every product puts it in —
// it used to be the first word of a box's title further down, where it read as
// a stray number nobody could attach to anything.
//
// **The rhythm between the blocks is this shell's, not each page's.** `main`
// used to be dropped in raw, so a page got exactly the spacing it remembered to
// write: a banner touching the sentence above it, stat tiles touching the
// banner, a filter row welded to the table under it. Nobody remembers it on
// every block, and a screen where everything touches reads as unfinished
// whatever the blocks themselves look like. One `space-y` here is every page at
// once — and a block that wants to sit closer says so itself.
export default function (ctx: Context, _session: Session | null, opts: {page: string; title?: string; count?: number; lead?: string; crumbs?: string; back?: string; backLabel?: string; right?: string; main: string }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const back = opts.back
        ? `<a class="ui-focusable tooltip tooltip-bottom text-base-content/50 hover:bg-base-200 hover:text-base-content -ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
    data-tip="${esc(opts.backLabel ?? "Back")}" aria-label="${esc(opts.backLabel ?? "Back")}" ${ctx.fns.procs.ui.attr({ action: "back" })}
    href="${esc(opts.back)}" hx-get="${esc(opts.back)}" hx-target="#main" hx-swap="innerHTML" hx-push-url="true"
  ><i class="ph ph-arrow-left text-lg" aria-hidden="true"></i></a>`
        : "";
    // The heading is the biggest thing on the page and the sentence under it is
    // readable prose, because this pair is how somebody knows where they are.
    // They used to be 18px and 12px — a title barely louder than a table header,
    // and a lead in the size otherwise reserved for ids and timestamps — which is
    // what made a finished screen still read as a debug view.
    // `crumbs` is where this page hangs from, and it goes ABOVE the title: the
    // way in is read before the name of the place, the way it is on every
    // page that has both.
    return `<section ${ctx.fns.procs.ui.attr({ page: opts.page })}>
${opts.crumbs ? `<div class="mb-2">${opts.crumbs}</div>` : ""}
${opts.title ? `<div class="flex items-center gap-2">${back}<h1 class="min-w-0 text-2xl font-semibold tracking-tight">${esc(opts.title)}</h1>${opts.count == null ? "" : `<span class="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-base-200 px-2 text-xs font-medium text-base-content/60" ${ctx.fns.procs.ui.attr({ role: "count" })}>${esc(opts.count)}</span>`}${opts.right ?? ""}</div>` : ""}
${opts.lead ? `<p class="mt-1.5 text-sm text-base-content/60">${opts.lead}</p>` : ""}
<div class="mt-5 space-y-4">${opts.main}</div>
</section>`;
}
