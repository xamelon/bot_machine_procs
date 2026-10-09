// Any number from a set — a symptom checklist, a multi-select. `layout: "cards"`
// is the button-group form: tappable buttons, each toggled on its own, the
// chosen ones ringed — the multi-select twin of radioGroup's cards. Posts an
// array (`name` repeated); the group carries `data-field`.
// **Cards lay themselves out by the column they are in, not by the window.**
// `sm:` is a *viewport* breakpoint, and the portal is a phone-wide column inside
// a wide desktop window: the window said "plenty of room" and four cards were
// drawn across 390 pixels with their labels cut off. `@container` on the wrapper
// makes this row the thing measured, and the `@` variants answer to it.
export default function (ctx: Context, _session: Session | null, opts: {
    name: string; value?: string[]; options: Array<{ value: string; label: string }>; layout?: "list" | "cards"; class?: string;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const on = new Set(opts.value ?? []);
    if (opts.layout === "cards") {
        // Selected look is CSS :has(input:checked) — not a server class bake — so
        // a click toggles the card immediately without a round-trip.
        const card = (o: { value: string; label: string }) => {
            const set = on.has(o.value);
            return `<label class="ui-radio-card border-base-300 bg-base-100 hover:border-primary hover:bg-base-200 relative flex cursor-pointer items-center justify-center rounded-md border px-3 py-2.5 text-center text-sm">
    <input type="checkbox" name="${esc(opts.name)}" value="${esc(o.value)}"${set ? " checked" : ""} class="sr-only"><span>${esc(o.label)}</span></label>`;
        };
        return `<div class="@container ${opts.class ?? ""}"><div class="grid grid-cols-2 gap-2 @md:grid-cols-3" ${ctx.fns.procs.ui.attr({ field: opts.name })}>${opts.options.map(card).join("")}</div></div>`;
    }
    return `<div class="space-y-2 ${opts.class ?? ""}" ${ctx.fns.procs.ui.attr({ field: opts.name })}>
  ${opts.options.map(o => `<label class="flex cursor-pointer items-center gap-3 text-sm">
    <input type="checkbox" name="${esc(opts.name)}" value="${esc(o.value)}"${on.has(o.value) ? " checked" : ""} class="checkbox checkbox-sm checkbox-primary">${esc(o.label)}</label>`).join("")}
</div>`;
}
