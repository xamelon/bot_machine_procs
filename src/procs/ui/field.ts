// One input. The name is what `page.fill({ form, values })` uses, and it is also
// written as `data-field` so a control that is not a native input (a menu, a
// custom widget) can still be found by the same name.
export default function (ctx: Context, _session: Session | null, opts: {
    name: string; value?: string; placeholder?: string; type?: string;
    options?: Array<string | { value: string; label: string }>; class?: string; ariaLabel?: string;
    // What it asks the server, when the field is itself a request — a search box
    // typing into a list. htmx's own words, so a field can be wired without
    // markup of its own.
    get?: string; trigger?: string; target?: string; swap?: string; vals?: Record<string, any>; sync?: string;
    // The marker it carries, when it is not a form field but a named control —
    // the chart's search box is `data-role="box"`, not `data-field="q"`.
    role?: string;
    // No frame: the field is inside something that already is one (a pill with
    // an icon in it), so the border and the height are the wrapper's.
    bare?: boolean;
    autocomplete?: string;
    min?: number | string; max?: number | string; step?: number | string; maxlength?: number; pattern?: string;
    required?: boolean; autofocus?: boolean;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const marks = `${opts.role ? ctx.fns.procs.ui.attr({ role: opts.role }) : ctx.fns.procs.ui.attr({ field: opts.name })}${opts.ariaLabel ? ` aria-label="${esc(opts.ariaLabel)}"` : ""}${opts.required ? " required" : ""}${opts.autofocus ? " autofocus" : ""}`;
    const cls = opts.class ?? "flex-1";
    const hx = opts.get
        ? ` hx-get="${esc(opts.get)}"${opts.trigger ? ` hx-trigger="${esc(opts.trigger)}"` : ""} hx-target="${esc(opts.target ?? "#main")}" hx-swap="${esc(opts.swap ?? "innerHTML")}"${opts.vals ? ` hx-vals='${esc(JSON.stringify(opts.vals))}'` : ""}${opts.sync ? ` hx-sync="${esc(opts.sync)}"` : ""}`
        : "";

    // A field with a set of values IS a select, and there is one of those —
    // this used to render a second, native one, so half the app's dropdowns
    // looked and behaved one way and half the other.
    if (opts.options) {
        return ctx.fns.procs.ui.select({
            name: opts.name, value: opts.value, class: cls, ariaLabel: opts.ariaLabel,
            options: opts.options.map(o => typeof o === "string" ? { value: o, label: o } : o),
        });
    }
    // The native validation attributes — also read back by `collect` on the
    // server, so a bypassed browser can't skip them.
    const limits = [
        opts.min != null ? `min="${esc(opts.min)}"` : "", opts.max != null ? `max="${esc(opts.max)}"` : "",
        opts.step != null ? `step="${esc(opts.step)}"` : "", opts.maxlength != null ? `maxlength="${esc(opts.maxlength)}"` : "",
        opts.pattern ? `pattern="${esc(opts.pattern)}"` : "",
    ].filter(Boolean).join(" ");
    return `<input name="${esc(opts.name)}" ${marks} type="${esc(opts.type ?? "text")}" value="${esc(opts.value ?? "")}"
  placeholder="${esc(opts.placeholder ?? "")}"${opts.autocomplete ? ` autocomplete="${esc(opts.autocomplete)}"` : ""}${limits ? " " + limits : ""}${hx} class="${opts.bare ? "" : "ui-input input input-sm "}${cls}">`;
}
