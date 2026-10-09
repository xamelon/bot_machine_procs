// One number that matters: a label, the value, and an optional unit or delta
// beside it. The tone tints the value — a severity, a pass/fail — nothing else.
//
// It draws its own three lines rather than wearing daisyUI's `.stat`, which
// carries a `min-inline-size` of its own: in a phone-wide column that minimum is
// wider than the column, so the tile pushed past its border and the number was
// clipped by whatever came next. A tile that cannot be narrower than a phone is
// not a tile for a phone. `min-w-0` and a value that wraps are what let a row of
// these shrink to whatever it has been given.
const TONE = {
    info: "text-info", success: "text-success",
    warning: "text-warning", danger: "text-error",
} as const;

export default function (ctx: Context, _session: Session | null, opts: {label: string; value: string | number; sub?: string; tone?: keyof typeof TONE; role?: string }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const tone = opts.tone ? ` ${TONE[opts.tone]}` : "";
    return `<div class="border-base-300 bg-base-100 min-w-0 rounded-md border px-4 py-3" ${ctx.fns.procs.ui.attr({ role: opts.role })}>
  <div class="text-base-content/60 truncate text-xs">${esc(opts.label)}</div>
  <div class="text-xl leading-tight font-semibold break-words${tone}">${esc(opts.value)}</div>
  ${opts.sub ? `<div class="text-base-content/50 mt-0.5 truncate text-xs">${esc(opts.sub)}</div>` : ""}
</div>`;
}
