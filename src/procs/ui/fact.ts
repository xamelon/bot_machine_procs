// One fact about the thing above it: what it is on the left, muted, and what
// it says on the right — three or four of them under a title read as a card
// rather than as a paragraph of times. `html` for a value that is a badge or
// a link; `role` is what a test or the workspace points at.
export default function (ctx: Context, _session: Session | null, opts: { label: string; text?: string; html?: string; role?: string }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<p class="flex items-baseline justify-between gap-2 text-sm" ${ctx.fns.procs.ui.attr({ role: opts.role })}>
    <span class="shrink-0 text-base-content/60">${esc(opts.label)}</span>
    <span class="min-w-0 truncate text-right text-base-content">${opts.html ?? esc(opts.text ?? "—")}</span>
  </p>`;
}
