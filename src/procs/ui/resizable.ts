export default function (ctx: Context, _session: Session | null, opts: {
    start: string; end: string; initial?: number; min?: number; max?: number; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/structure.js" });
    return `<div class="asx-resizable ${esc(opts.class ?? "")}" data-asx-resizable style="--asx-resizable-size:${esc(opts.initial ?? 50)}%">
        <div class="asx-resizable__pane asx-resizable__start">${opts.start}</div>
        <button class="asx-resizable__handle" data-asx-resize-handle type="button" role="separator" aria-label="Resize" aria-orientation="vertical" aria-valuemin="${esc(opts.min ?? 20)}" aria-valuemax="${esc(opts.max ?? 80)}" aria-valuenow="${esc(opts.initial ?? 50)}" data-min="${esc(opts.min ?? 20)}" data-max="${esc(opts.max ?? 80)}"></button>
        <div class="asx-resizable__pane asx-resizable__end">${opts.end}</div>
        <script src="${esc(src)}" defer></script>
    </div>`;
}
