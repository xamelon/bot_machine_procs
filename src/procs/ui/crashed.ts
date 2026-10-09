// What a handler that THREW looks like to the person — a page, never a stack.
//
// A raw `e.stack` used to be the body of every dev 500, and under htmx those
// bytes land inside #main: a patient answering a form saw a JSON dump where
// their questions were. So a crash returns a value like any other page and
// `toResponse` dresses it: a plain sentence, the incident id that names the
// log line, and — in dev only — the message folded behind a <details>, for the
// developer or the agent reading the page, not for the person.
export default function (ctx: Context, _session: Session | null, opts: { id: string; message?: string }) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const dev = ctx.env.NODE_ENV !== "production";
    return {
        title: "Something went wrong",
        status: 500,
        main: ctx.fns.procs.ui.page({
            page: "crashed",
            title: "Something went wrong",
            main: `${ctx.fns.procs.ui.notice({ tone: "danger", text: `This action could not finish. It has been recorded — mention code ${opts.id} if you report it.` })}
${dev && opts.message ? `<details class="mt-3 text-sm"><summary class="text-base-content/50 cursor-pointer">details for the developer</summary><pre class="bg-base-200 mt-2 overflow-x-auto rounded p-3 text-xs">${esc(opts.message)}</pre></details>` : ""}`,
        }),
    };
}
