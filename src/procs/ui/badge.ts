// A small fact about the thing next to it — a state, a count, a face a module
// wears. daisyUI's `badge`, soft so it sits inside a row without shouting.
//
// A badge is a label of a few words, never a sentence: it does not wrap (a
// second line would fall out of daisyUI's fixed-height pill), so what does not
// fit on one line belongs in plain text beside it, not inside it.
//
// The tone is written out rather than built into the class name: a class Tailwind
// only ever sees as `badge-${tone}` is a class it never generates.
// A tone is a claim — abnormal, final, in progress — and wears its colour. No
// tone is a plain word about the thing beside it (a kind, a count, a queue),
// and a grey slab makes it the loudest thing in the row it was meant to
// annotate: it is the same small pill, in ink at a whisper, with no fill.
const TONE = {
    neutral: "border-transparent bg-transparent text-base-content/50 px-0",
    info: "badge-soft badge-info", success: "badge-soft badge-success",
    warning: "badge-soft badge-warning", danger: "badge-soft badge-error",
} as const;

export default function (ctx: Context, _session: Session | null, opts: {text: string; tone?: keyof typeof TONE; role?: string }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<span class="badge badge-sm h-auto whitespace-nowrap py-0.5 ${TONE[opts.tone ?? "neutral"]}" ${ctx.fns.procs.ui.attr({ role: opts.role })}>${esc(opts.text)}</span>`;
}
