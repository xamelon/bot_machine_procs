// The one 500 for both doors (the server and dispatch): log the whole error
// under an incident id, then answer by what the caller reads. HTML — a page or
// an htmx swap — gets `procs.ui.crashed` through `toResponse`, so a person sees
// a sentence and a code where a stack used to land inside #main. Anything else
// keeps the developer's plain 500: the message and stack in dev, six words in
// production. No handler can put a stack on a screen any more, however it fails.
export default function (ctx: Context, _session: Session | null, opts: { error: any; req: Request }): Response {
    const e = opts.error;
    const id = Math.random().toString(36).slice(2, 8);
    ctx.fns.procs.log.error({ event: "http.crashed", msg: `[${id}] ${e?.message ?? e}`, stack: String(e?.stack ?? "").slice(0, 2_000) });

    const wantsHtml = opts.req.headers.get("hx-request") === "true"
        || opts.req.headers.get("accept")?.includes("text/html");
    if (wantsHtml) {
        const res = ctx.fns.procs.http.toResponse({ value: ctx.fns.procs.ui.crashed({ id, message: String(e?.message ?? e) }) });
        return new Response(res.body, { status: 500, headers: res.headers });
    }

    const dev = ctx.env.NODE_ENV !== "production";
    const body = dev ? `${e?.message}\n\n${e?.stack ?? ""}` : "Internal Server Error";
    return new Response(body, { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } });
}
