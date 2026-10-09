// A dropdown of actions — a row's kebab, a "more" button. A <details> disclosure
// with an absolutely-positioned panel whose trigger is a kit button with a
// caret; `$script_menu.js` is what closes it on a click outside, on Escape and
// on a pick.
// Each item is an action (data-action), a link, or an htmx post.
export default function (ctx: Context, _session: Session | null, opts: {
    id?: string; label?: string; icon?: string;
    // The whole trigger, when a word and an icon are not it — a card, a name
    // over a role. Given one, the whole thing is the button: half a control
    // being hoverable is a control people miss. The summary then carries nothing
    // but the focus ring — its own frame, padding and hover belong to the markup
    // that was handed in, or a caller could not give it any.
    trigger?: string;
    items: Array<{
        label: string; icon?: string; href?: string; action?: string; id?: string; entity?: string; status?: string; post?: string; get?: string;
        vals?: Record<string, any>; danger?: boolean;
        // Where the answer lands, and what it replaces. A menu used to be a
        // list of navigations, so every item swapped #main — which is right for
        // "go here" and wrong for "do this to this row", where what comes back
        // is the list the row is in.
        target?: string; swap?: string;
        // "This removes its folder." — an item that cannot be undone asks first.
        confirm?: string;
        // …and an item that needs more than a click — an address to invite, a
        // name to type — opens a `ui.dialog` by id instead of doing anything.
        popover?: string;
        // …and the whole row, for an item that is two lines rather than one.
        html?: string;
    }>;
    // The trigger IS a kit button: the same tone, the same size, and the caret
    // `ui.button` draws — a menu that opens under a control people already know.
    tone?: "default" | "primary" | "ghost" | "danger" | "outline" | "success" | "warning" | "neutral";
    size?: "xs" | "sm" | "md";
    align?: "left" | "right"; class?: string;
    // Opens upward, for a trigger that sits at the foot of a column — a panel
    // that drops off the bottom of the window is one nobody can read.
    up?: boolean;
    // A hairline between rows, and room around them — for a menu whose items are
    // more than a word: two two-line items packed tight and with nothing between
    // them read as one four-line item.
    separated?: boolean;
    width?: string;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    // daisyUI's `dropdown` on a <details>, with `menu` inside it — the panel,
    // the hover states and the item padding are the component's.
    // A menu where SOME rows carry an icon keeps the column for the ones that do
    // not — a tick beside the chosen row is a column, and without the spacer
    // every other row slides left under it and the list stops being a list.
    const marked = opts.items.some(it => it.icon);
    const item = (it: (typeof opts.items)[number]) => {
        const cls = it.danger ? "text-error" : "";
        // A two-line row aligns its icon with the FIRST line, not with the
        // middle of both: an icon floating beside a gap is what a centred one
        // looks like the moment a row grows a second line.
        const icon = it.icon
            ? `<i class="ph ${esc(it.icon)} w-4 shrink-0 self-start mt-0.5 opacity-60" aria-hidden="true"></i>`
            : marked ? `<span class="w-4 shrink-0" aria-hidden="true"></span>` : "";
        const hx = it.post ? `hx-post="${esc(it.post)}"` : it.get ? `hx-get="${esc(it.get)}"` : "";
        const vals = it.vals ? ` hx-vals="${esc(JSON.stringify(it.vals))}"` : "";
        const ask = it.confirm ? ` hx-confirm="${esc(it.confirm)}"` : "";
        const lands = ` hx-target="${esc(it.target ?? "#main")}" hx-swap="${esc(it.swap ?? "innerHTML")}"`;
        const opens = it.popover ? ` popovertarget="${esc(it.popover)}"` : "";
        const action = it.action ?? (it.href || it.get ? "open" : it.post ? "select" : undefined);
        const marker = ctx.fns.procs.ui.attr({ action, entity: it.entity, id: it.id, status: it.status });
        const inner = it.href
            ? `<a class="${cls}" href="${esc(it.href)}" ${marker} hx-get="${esc(it.href)}" hx-target="#main" hx-swap="innerHTML" hx-push-url="true" role="menuitem">${icon}${it.html ?? esc(it.label)}</a>`
            : `<button type="button" class="${cls}" ${marker}${opens} ${hx}${vals}${it.post || it.get ? lands : ""}${ask} role="menuitem">${icon}${it.html ?? esc(it.label)}</button>`;
        return `<li class="${opts.separated ? "border-t border-base-200 first:border-t-0" : ""}">${inner}</li>`;
    };
    const trigger = opts.trigger ? opts.trigger : opts.label || opts.icon
        ? `${opts.icon ? `<i class="ph ${esc(opts.icon)}" aria-hidden="true"></i>` : ""}${opts.label ? `<span>${esc(opts.label)}</span>` : ""}<i class="ph ph-caret-down text-xs" aria-hidden="true"></i>`
        : `<i class="ph ph-dots-three" aria-hidden="true"></i>`;
    // The summary wears what `ui.button` would have written for the same tone
    // and size — read off a rendered one, so the two can never drift apart —
    // and nothing else but hiding the disclosure marker: a padding or a gap of
    // its own here is a trigger a hair taller than the buttons beside it.
    const button = ctx.fns.procs.ui.button({ action: "menu", label: "", tone: opts.tone ?? "ghost", size: opts.size ?? "xs" });
    const classes = button.match(/class="([^"]*)"/)?.[1] ?? "btn btn-xs btn-ghost";
    return `<details class="dropdown ${opts.align === "left" ? "" : "dropdown-end"}${opts.up ? " dropdown-top" : ""} ${opts.class ?? ""}" ${ctx.fns.procs.ui.attr({ entity: "menu", id: opts.id })}>
  <summary class="${opts.trigger ? "ui-focusable cursor-pointer list-none rounded-lg" : `ui-focusable list-none [&::-webkit-details-marker]:hidden ${classes}`}" ${ctx.fns.procs.ui.attr({ action: "menu" })} aria-haspopup="menu">${trigger}</summary>
  <ul class="menu dropdown-content bg-base-100 rounded-box z-50 mt-1 ${esc(opts.width ?? "w-52")} p-2 shadow-lg${opts.separated ? " ui-menu-roomy" : ""}" role="menu">${opts.items.map(item).join("")}</ul>
</details>`;
}
