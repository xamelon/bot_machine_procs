export default function (ctx: Context, _session: Session | null, opts: {
    name?: string; value?: string; month?: string; min?: string; max?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/calendar.js" });
    const value = opts.value ?? new Date().toISOString().slice(0, 10);
    const month = opts.month ?? value.slice(0, 7);
    return `<div class="asx-calendar ${esc(opts.class ?? "")}" data-asx-calendar data-value="${esc(value)}" data-month="${esc(month)}" data-min="${esc(opts.min ?? "")}" data-max="${esc(opts.max ?? "")}">
        <div class="asx-calendar__head">
            <button type="button" data-asx-cal-prev aria-label="Previous month"><i class="ph ph-caret-left" aria-hidden="true"></i></button>
            <strong data-asx-cal-title></strong>
            <button type="button" data-asx-cal-next aria-label="Next month"><i class="ph ph-caret-right" aria-hidden="true"></i></button>
        </div>
        <div class="asx-calendar__weekdays" aria-hidden="true"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
        <div class="asx-calendar__grid" data-asx-cal-grid></div>
        ${opts.name ? `<input type="hidden" name="${esc(opts.name)}" value="${esc(value)}" data-asx-cal-hidden>` : ""}
        <script src="${esc(src)}" defer></script>
    </div>`;
}
