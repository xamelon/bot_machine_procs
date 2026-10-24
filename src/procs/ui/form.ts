// A form owns field width and vertical rhythm; callers supply controls, not layout classes.
export default function (ctx: Context, _session: Session | null, opts: {
    body: string; form?: string; id?: string; class?: string;
    post?: string; get?: string; push?: boolean;
    action?: string; method?: "post" | "get"; enctype?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const request = opts.post ? ` hx-post="${esc(opts.post)}"` : opts.get ? ` hx-get="${esc(opts.get)}"` : "";
    const hx = request ? `${request} hx-target="#main" hx-swap="innerHTML"${opts.push ? ' hx-push-url="true"' : ""}` : "";
    return `<form class="asx-form ${esc(opts.class ?? "")}"${opts.id ? ` id="${esc(opts.id)}"` : ""} ${ctx.fns.procs.ui.attr({ form: opts.form })}${opts.action ? ` action="${esc(opts.action)}" method="${esc(opts.method ?? "post")}"` : ""}${opts.enctype ? ` enctype="${esc(opts.enctype)}"` : ""}${hx}>${opts.body}</form>`;
}
