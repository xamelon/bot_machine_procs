// One value out of a set — a code, a status, who a job is for.
//
// **Not a native `<select>`.** A native one is the browser's widget, and while
// its list is open the platform paints its own state over the control: on macOS
// a heavy black ring, in a UI whose accent is violet, which no stylesheet can
// reach — the page reports `outline: none` and `box-shadow: none` at that exact
// moment and the ring is there anyway. So the control is a button and a list of
// our own, and its focused and open states are `ui.field`'s, because they are
// the same two rules.
//
// What it keeps from the native one, because everything already relies on it:
// the value posts under `name` (a hidden input), `data-field` carries the name
// for `page.fill`, and picking fires a real bubbling `change`, so a form that
// recomputes on change (skip logic, a live score, an htmx `hx-trigger="change"`)
// cannot tell the difference. An empty first option is "no answer" — a
// required-but-untouched select still fails.
//
// The behaviour is `$script_select.js`, by delegation on the markers below, so
// there is no per-widget wiring and it survives every htmx swap.
export default function (ctx: Context, _session: Session | null, opts: {
    name: string; value?: string; options: Array<{ value: string; label: string }>; placeholder?: string; class?: string; ariaLabel?: string;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const chosen = opts.value != null && opts.value !== "" ? opts.options.find(o => o.value === opts.value) : undefined;
    const placeholder = opts.placeholder ?? "Select…";

    const option = (o: { value: string; label: string }) => `<li role="option" data-value="${esc(o.value)}"
    aria-selected="${o.value === (opts.value ?? "") ? "true" : "false"}"
    class="ui-select__option"><i class="ph ph-check" aria-hidden="true"></i><span class="min-w-0 truncate">${esc(o.label)}</span></li>`;

    return `<div class="ui-select relative ${opts.class ?? "w-full"}" ${ctx.fns.procs.ui.attr({ field: opts.name })} data-select>
  <input type="hidden" name="${esc(opts.name)}" value="${esc(opts.value ?? "")}">
  <button type="button" class="ui-input ui-select__button input input-sm w-full"
    aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(opts.ariaLabel ?? opts.name)}"
    ${ctx.fns.procs.ui.attr({ action: "open-select" })}
  ><span class="min-w-0 flex-1 truncate text-left${chosen ? "" : " text-base-content/50"}" ${ctx.fns.procs.ui.attr({ role: "label" })}>${esc(chosen?.label ?? placeholder)}</span
  ><i class="ph ph-caret-down shrink-0 text-base-content/50" aria-hidden="true"></i></button>
  <ul class="ui-select__options hidden" role="listbox" tabindex="-1">
    ${option({ value: "", label: placeholder })}${opts.options.map(option).join("")}
  </ul>
</div>`;
}
