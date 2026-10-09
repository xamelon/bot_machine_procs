// A control that does something, and therefore one that carries `data-action` —
// the verb, not the label, so `page.click({ action: "materialize" })` keeps
// working when the wording changes. Give it the `entity`/`id` it acts on and the
// same descriptor addresses it from anywhere on the page.
//
// `post`/`get` wire it to htmx; without either it is a plain button for a form
// to submit or for client.js to handle.
// daisyUI's `btn`. `default` is the quiet FILLED one a toolbar is full of — a
// pale pill with a faint border, spelled out rather than `btn-soft` or a
// `base-200` fill, either of which is the page's own background and so
// invisible on it until hovered; `primary` is the one action a screen is actually about. `outline` is
// the outline itself, for the caller that wants it.
// Spelled out rather than interpolated: the stylesheet is built by scanning
// this source for class names, and `tooltip-${side}` is not a name it can see.
const TIP = { top: "tooltip-top", bottom: "tooltip-bottom", left: "tooltip-left", right: "tooltip-right" } as const;

const TONE = {
    default: "border-transparent bg-primary/10 text-base-content hover:bg-primary/15 shadow-none",
    primary: "btn-primary", danger: "btn-error btn-outline",
    ghost: "btn-ghost", success: "btn-success", warning: "btn-warning", neutral: "btn-neutral",
    outline: "btn-outline",
} as const;

// Spelled out for the same reason as `TIP`: the stylesheet is built by scanning
// this source, and `btn-${size}` is not a name it can see.
const SIZE = { xs: "btn-xs", sm: "btn-sm", md: "btn-md" } as const;

// …and the icon button, which is not a `btn` at all, sizes by its own padding.
const BARE_SIZE = { xs: "p-1 text-sm", sm: "p-1.5 text-base", md: "p-2 text-lg" } as const;

export default function (ctx: Context, _session: Session | null, opts: {
    action: string; label: string; icon?: string; entity?: string; id?: string;
    post?: string; get?: string; vals?: Record<string, any>; target?: string; swap?: string; confirm?: string; popover?: string; tip?: "top" | "bottom" | "left" | "right";
    tone?: keyof typeof TONE; size?: keyof typeof SIZE; title?: string; disabled?: boolean; name?: string; value?: string;
    // What fires the request, when the default click is not it — htmx's own
    // trigger syntax, e.g. `"click consume"` for a button inside something that
    // is itself clickable.
    trigger?: string;
    // A `get` that is a place — the address follows it, as a tab's does.
    push?: boolean;
    // The glyph that says "this opens something under it" — a real caret, never
    // a `▾` typed into the label.
    chevron?: boolean;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const hx = opts.post ? `hx-post="${esc(opts.post)}"` : opts.get ? `hx-get="${esc(opts.get)}"` : "";
    const vals = opts.vals ? ` hx-vals="${esc(JSON.stringify(opts.vals))}"` : "";
    const target = hx ? ` hx-target="${esc(opts.target ?? "#main")}" hx-swap="${esc(opts.swap ?? "innerHTML")}"${opts.push ? ` hx-push-url="true"` : ""}` : "";
    const fires = hx && opts.trigger ? ` hx-trigger="${esc(opts.trigger)}"` : "";
    // "This removes its folder." — the one place a button asks before it acts.
    const ask = opts.confirm ? ` hx-confirm="${esc(opts.confirm)}"` : "";
    // The button that opens a dialog — `ui.dialog`'s own trigger, so a modal can
    // be opened by the same control as everything else instead of by markup of
    // its own. Still JS-free: this is the HTML Popover API.
    const opens = opts.popover ? ` popovertarget="${esc(opts.popover)}"` : "";
    // `name` makes it a submit that says which button was pressed — how a Back or
    // a Save-draft beside a form is told apart from its Submit.
    // …and a button that opens a dialog is `type="button"`, always: a button's
    // default type is submit, and a submit button standing in a form takes the
    // form with it instead of opening anything.
    // A button standing in a form is a SUBMIT unless it says otherwise — the
    // browser's rule, and Enter in a field presses the first one. A button that
    // carries its own request is not that: it acts on its own, and left as a
    // submit it swallowed Enter from the field beside it (the search box's own
    // icons answered Enter with the agent's form). So: a request of its own, or
    // a popover, makes it `type="button"`; `name` makes it the submit that says
    // which button was pressed; a bare one stays the form's submit.
    const kind = opts.popover || hx ? ` type="button"`
        : opts.name ? ` type="submit" name="${esc(opts.name)}" value="${esc(opts.value ?? "1")}"` : "";
    // **An `icon` makes it a square button, and the label becomes its tooltip.**
    // A row of four worded buttons is the first thing a table runs out of room
    // for, and those words repeat on every row — so the glyph carries the
    // meaning while the label stays as what the button is announced as and what
    // the tooltip says. One rule, no second flag: give an icon, get an icon.
    const bare = Boolean(opts.icon);
    // The icon button is quiet on purpose and is NOT daisyUI's `btn`: a row of
    // them is a toolbar at the end of a line, and four filled-weight buttons
    // there read louder than the row itself — besides being wide enough to put a
    // table into horizontal scroll.
    // The bubble opens to the LEFT by default. An icon button lives at the
    // right-hand end of a row, and a bubble pointing up is laid out past the
    // pane's right edge even while it is invisible — seven pixels of it, which is
    // all a scroll container needs to grow a horizontal scrollbar under a table
    // that otherwise fits. `tip` is for the button that does NOT live there: at
    // the left edge of a narrow column, a left-hand bubble is cut in half by the
    // window.
    // …and a ghost icon button has no frame at all: three of them in a widget's
    // header are a control strip, not three little boxes. Its hover is a tint
    // of ink rather than the page's own grey, so it shows on the grey canvas
    // as well as on a white card.
    const framed = opts.tone === "ghost" ? "" : "border border-base-300 ";
    const quiet = `ui-focusable tooltip ${TIP[opts.tip ?? "left"]} inline-flex items-center justify-center rounded-md ${framed}${BARE_SIZE[opts.size ?? "sm"]} text-base-content/60 hover:bg-base-content/10 hover:text-base-content${opts.tone === "danger" ? " hover:border-error/30 hover:text-error" : ""}`;
    const caret = opts.chevron ? `<i class="ph ph-caret-down text-xs" aria-hidden="true"></i>` : "";
    const inside = bare ? `<i class="ph ${esc(opts.icon)}" aria-hidden="true"></i>` : `${esc(opts.label)}${caret}`;

    return `<button${kind} class="${bare ? quiet : `btn ${SIZE[opts.size ?? "sm"]} ${TONE[opts.tone ?? "default"]}`}" ${ctx.fns.procs.ui.attr({ action: opts.action, entity: opts.entity, id: opts.id })}${bare ? ` data-tip="${esc(opts.title ?? opts.label)}" aria-label="${esc(opts.label)}"` : opts.title ? ` title="${esc(opts.title)}"` : ""}${opts.disabled ? " disabled" : ""}${opens} ${hx}${vals}${fires}${target}${ask}>${inside}</button>`;
}
