// A button group — a segmented control for one choice among a few: a filter
// toolbar, a view switch. Each item is a link (the selection lives in the URL)
// or, given a `name`, a set of buttons the form posts. The chosen one is raised.
export default function (ctx: Context, _session: Session | null, opts: {items: Array<{ label: string; value: string; href?: string }>; value?: string; name?: string }): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const seg = (it: { label: string; value: string; href?: string }) => {
        const on = it.value === opts.value;
        // A track with the chosen segment raised out of it — the switch every
        // phone has taught: the row is one grey pill, the choice is the white
        // piece standing on it, and nothing here spends the brand colour on
        // "which view am I looking at".
        const cls = `rounded-full px-3 py-1 text-sm transition-colors ${on
            ? "bg-base-100 font-medium text-base-content shadow-sm"
            : "text-base-content/70 hover:text-base-content"}`;
        if (it.href) return `<a class="${cls}" aria-current="${on ? "true" : "false"}" ${ctx.fns.procs.ui.attr({ action: "select", role: "segment", id: it.value || "all", status: on ? "active" : "" })} href="${esc(it.href)}" hx-get="${esc(it.href)}" hx-target="#main" hx-swap="innerHTML" hx-push-url="true">${esc(it.label)}</a>`;
        return `<button type="button" class="${cls}" ${ctx.fns.procs.ui.attr({ action: "select", id: it.value, status: on ? "active" : "" })}>${esc(it.label)}</button>`;
    };
    return `<div class="inline-flex items-center gap-0.5 rounded-full border border-base-300 bg-base-300/60 p-1" role="group" aria-label="options" ${ctx.fns.procs.ui.attr({ field: opts.name })}>${opts.items.map(seg).join("")}</div>`;
}
