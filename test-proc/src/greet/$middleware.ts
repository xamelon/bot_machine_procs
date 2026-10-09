// Middleware runs before any handler under its prefix — here `/greet` — and can
// do two things: extend the session, which then flows to the handler and to
// everything it calls through ctx.fns, or return a Response to short-circuit.
export default function (ctx: Context, session: Session, opts: { req: Request }) {
    const who = new URL(opts.req.url).searchParams.get("who");
    if (who === "nobody") return new Response("no", { status: 403 });   // short-circuit
    (session as any).who = who ?? "world";                              // extend the session
    (session as any).greeting = ctx.env.GREETING ?? "hello";            // from workspace.json env
}
