// A form the workspace can fill and submit: it carries `data-form`, so
// `page.fill({ form })` and `page.submit({ form })` find it and `page.state`
// lists its fields. `post`/`get` are the htmx wiring; the pane is the target
// unless something narrower is given.
//
// **A form is a column, and the button that submits it is under it.** That is
// what `class` defaults to, because it is the only layout that is right for a
// form of any height: the default used to be `flex items-center gap-2` — a
// search bar — and a nine-field entry form written without a `class` came out as
// a tall left column with its Save floating in the middle of the empty half
// beside it, vertically centred by the `items-center` nobody asked for.
// A one-line toolbar — a filter, a search beside a box's title — says so:
// `class: "flex items-center gap-2"`.
export default function (ctx: Context, _session: Session | null, opts: {
    form: string; body: string; entity?: string; id?: string; htmlId?: string; status?: string; post?: string; get?: string;
    target?: string; swap?: string; pushUrl?: boolean; trigger?: string; class?: string;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const hx = opts.post ? `hx-post="${esc(opts.post)}"` : opts.get ? `hx-get="${esc(opts.get)}"` : "";
    return `<form${opts.htmlId ? ` id="${esc(opts.htmlId)}"` : ""} class="${opts.class ?? "space-y-4"}" ${ctx.fns.procs.ui.attr({ form: opts.form, entity: opts.entity, id: opts.id, status: opts.status })}
  ${hx} hx-target="${esc(opts.target ?? "#main")}" hx-swap="${esc(opts.swap ?? "innerHTML")}"${opts.pushUrl ? ` hx-push-url="true"` : ""}${opts.trigger ? ` hx-trigger="${esc(opts.trigger)}"` : ""}>
  ${opts.body}
</form>`;
}
