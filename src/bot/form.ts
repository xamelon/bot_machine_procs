export default function (ctx: Context, _session: Session | null, opts: {
    form?: string; post?: string; get?: string; push?: boolean; class?: string; body: string; id?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const method = opts.post ? ` hx-post="${esc(opts.post)}"` : opts.get ? ` hx-get="${esc(opts.get)}"` : "";
    // `asx-form` is what makes the fields fill the form; without it a labelled
    // input keeps its own cap and a wide form is a column of narrow boxes.
    const classes = `${esc(opts.class ?? "grid gap-3")} asx-form`;
    return `<form${opts.id ? ` id="${esc(opts.id)}"` : ""} class="${classes}" ${ctx.fns.procs.ui.attr({ form: opts.form })}${method} hx-target="#main" hx-swap="innerHTML"${opts.push ? " hx-push-url=\"true\"" : ""}>${opts.body}</form>`;
}
