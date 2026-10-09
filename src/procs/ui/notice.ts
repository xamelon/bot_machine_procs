// What went wrong, or what just worked. One shape for both so a page does not
// invent its own each time. It carries `data-role="notice"` and `data-tone`
// (success/danger/warning/info), so an agent that pressed a button and stayed on
// the page reads the result off the notice — `page.text({ role: "notice" })`, or
// `page.state().notices`. This is distinct from a field's validation error,
// which is `data-role="error"` inside `[data-field][data-invalid]`.
//
// **Every tone carries a border.** It used to be daisyUI's `alert-soft`, which
// is a tint and nothing else: on the grey the workspace draws its pages on, a
// pale amber band on near-white was a rectangle you had to be told was there —
// the one element on the page whose whole job is to be noticed. A border in the
// tone's own colour is what separates it from the paper, and it is drawn here
// rather than left to a caller, because a warning nobody sees is worse than no
// warning at all.
//
// It is also drawn by hand rather than through `alert`, whose padding is a grid
// with its own opinions: the text sat hard against the edges at one line and
// floated at two.
// The border and the icon carry the tone; the sentence is read in the page's own
// ink. daisyUI's `*-content` colours are meant for text ON a solid fill — over a
// tenth-strength tint an amber-on-cream warning is the thing that was hard to
// read in the first place.
const TONE = {
    info: "border-info/40 bg-info/10", success: "border-success/40 bg-success/10",
    warning: "border-warning/45 bg-warning/10", danger: "border-error/40 bg-error/10",
} as const;
const INK = { info: "text-info", success: "text-success", warning: "text-warning", danger: "text-error" } as const;

const MARK = { info: "ph-info", success: "ph-check-circle", warning: "ph-warning", danger: "ph-warning-octagon" } as const;

export default function (ctx: Context, _session: Session | null, opts: {text: string; tone?: keyof typeof TONE }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const tone = opts.tone ?? "info";
    // `my-3` is the notice's own, not the page's: it turns up inside a box, above
    // a form, between two sections — anywhere but as a tidy child of `ui.page`,
    // whose rhythm reaches only its own children. A banner welded to the block it
    // is warning about was the complaint after the border was fixed. In normal
    // flow this collapses against the page's own spacing, so it never doubles.
    return `<div class="text-base-content my-3 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${TONE[tone]}"
  ${ctx.fns.procs.ui.attr({ role: "notice" })} data-tone="${tone}">
  <i class="ph ${MARK[tone]} ${INK[tone]} mt-0.5 shrink-0 text-base" aria-hidden="true"></i>
  <span class="min-w-0">${esc(opts.text)}</span>
</div>`;
}
