// A switch — on or off, applied at once. It carries the verb (`data-action`) and
// the field name (`data-field`); `post`/`get` wire the flip to htmx, the hidden
// input carries the value a form reads.
export default function (ctx: Context, _session: Session | null, opts: {action: string; name?: string; on?: boolean; label?: string; post?: string; get?: string; vals?: Record<string, any>; target?: string; swap?: string;
    // What fires the request, when the checkbox's own `change` is not it —
    // htmx's trigger syntax, e.g. `"click consume"` for a switch standing
    // inside something that is itself clickable.
    trigger?: string;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const hx = opts.post ? `hx-post="${esc(opts.post)}"` : opts.get ? `hx-get="${esc(opts.get)}"` : "";
    const vals = opts.vals ? ` hx-vals="${esc(JSON.stringify(opts.vals))}"` : "";
    // daisyUI's `toggle` is a checkbox it styles itself, so the switch is the
    // input rather than a button wrapping one — the flip still goes through htmx.
    //
    // A switch wired to htmx applies itself, so what a form would read is a
    // hidden field beside it. A switch that is NOT wired is an ordinary form
    // control and carries the name itself — a browser leaves an unchecked box
    // out, so the field is there or it is not.
    const wired = Boolean(hx);
    const fires = wired && opts.trigger ? ` hx-trigger="${esc(opts.trigger)}"` : "";
    return `<label class="label cursor-pointer justify-start gap-2" ${ctx.fns.procs.ui.attr({ field: opts.name })}>
  ${opts.name && wired ? `<input type="hidden" name="${esc(opts.name)}" value="${opts.on ? "true" : "false"}">` : ""}
  <input type="checkbox" class="toggle toggle-sm toggle-primary" role="switch" ${opts.on ? "checked" : ""}
    ${opts.name && !wired ? `name="${esc(opts.name)}" value="true"` : ""}
    aria-label="${esc(opts.label ?? opts.name ?? opts.action)}"
    ${ctx.fns.procs.ui.attr({ action: opts.action })} ${hx}${vals}${fires}${wired ? ` hx-target="${esc(opts.target ?? "#main")}" hx-swap="${esc(opts.swap ?? "innerHTML")}"` : ""}>
  ${opts.label ? `<span class="label-text text-sm">${esc(opts.label)}</span>` : ""}
</label>`;
}
