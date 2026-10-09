// A row of narrowings over a list — the same control everywhere, because
// "narrow this list" is one idea and it was three markups.
//
// Every group is a label and a set of choices. Few choices are **chips** (all of
// them visible, one click each); many are a **menu** (the chosen one on the
// button, the rest one click away) — the kit picks by count rather than making
// every caller decide, so two pages with four options never disagree about what
// four options look like.
//
// The chosen thing is inverted ink-on-paper in both shapes and everything is one
// height, so a window, a kind and a state read as three answers to the same
// question rather than as three unrelated controls.
//
// **Every choice is a link.** A filter belongs in the url — it is what makes a
// narrowed list sendable and the back button work — so the caller hands each
// item the address it leads to and this draws it. Nothing here holds state.
export default function (ctx: Context, _session: Session | null, opts: {
    groups: Array<{
        label: string;                    // "when", "type", "status"
        value?: string;                   // what is chosen; empty means nothing is
        empty?: string;                   // what "nothing chosen" is called — "any"
        items: Array<{ label: string; value: string; href: string; count?: number }>;
        as?: "chips" | "menu";            // override the count rule
    }>;
    right?: string;                       // a control that belongs to the row rather than to a group
    class?: string;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });

    // Four is where a strip of chips stops being readable at a glance and starts
    // being a queue of words to scan.
    const shape = (g: (typeof opts.groups)[number]) => g.as ?? (g.items.length <= 3 ? "chips" : "menu");

    const skin = (on: boolean) => on
        ? "border-base-content/75 bg-base-content/75 text-base-100"
        : "border-base-300 bg-base-100 hover:bg-base-200";
    const box = "inline-flex h-7 items-center rounded-md border px-2.5 text-xs";

    // A lit chip is a toggle: pressing it again leads back to the group's
    // "nothing chosen" address (the item whose value is empty), so a narrowing
    // can always be undone where it was made — a filter with no way off it
    // holds the list hostage.
    const chip = (g: any, it: any) => {
        const on = it.value === (g.value ?? "");
        const href = on && it.value ? (g.items.find((x: any) => !x.value)?.href ?? it.href) : it.href;
        return `<a class="${box} ${skin(on)}"
  href="${esc(href)}" hx-get="${esc(href)}" hx-target="#main" hx-swap="innerHTML" hx-push-url="true"
  ${ctx.fns.procs.ui.attr({ action: "filter", id: it.value || "all", status: on ? "active" : undefined })}>${esc(it.label)}${it.count == null ? "" : ` <span class="ml-1 opacity-60">${esc(it.count)}</span>`}</a>`;
    };

    const menu = (g: any) => {
        const chosen = g.items.find((it: any) => it.value === (g.value ?? ""));
        const on = Boolean(g.value);
        return ctx.fns.procs.ui.menu({
            id: `filter-${g.label}`, align: "left", width: "w-60",
            // No leading glyph: an icon beside the word "any" decorates the
            // filter without narrowing it, and one icon per group reads as
            // several unrelated things in a row. Only the caret, which says it
            // opens.
            trigger: `<span class="${box} gap-1.5 ${skin(on)}" ${ctx.fns.procs.ui.attr({ role: "filter", id: g.label })}
      ><span class="max-w-36 truncate">${esc(chosen?.label ?? g.empty ?? "any")}</span><i class="ph ph-caret-down text-[10px] opacity-60" aria-hidden="true"></i></span>`,
            items: g.items.map((it: any) => ({
                label: it.count == null ? it.label : `${it.label} · ${it.count}`,
                action: "filter", id: it.value || "all", status: it.value === (g.value ?? "") ? "active" : undefined,
                href: it.href,
            })),
        });
    };

    const group = (g: (typeof opts.groups)[number]) => `<span class="flex shrink-0 items-center gap-1.5" ${ctx.fns.procs.ui.attr({ field: g.label })}>
    <span class="text-[10px] tracking-wide text-base-content/35 uppercase">${esc(g.label)}</span>
    ${shape(g) === "chips" ? `<span class="flex items-center gap-1">${g.items.map(it => chip(g, it)).join("")}</span>` : menu(g)}
  </span>`;

    return `<div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 ${opts.class ?? ""}" ${ctx.fns.procs.ui.attr({ role: "filters" })}>
  ${opts.groups.filter(g => g.items.length > 1).map(group).join("")}
  ${opts.right ? `<span class="flex-1"></span>${opts.right}` : ""}
</div>`;
}
