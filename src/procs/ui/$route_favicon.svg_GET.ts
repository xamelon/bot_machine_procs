// GET /procs/ui/favicon.svg — the tab icon for every host on this framework.
// An SVG favicon rather than a binary .ico: every current browser takes one and
// there is no build step to forget. Cached for a day; the mark does not change.
export default async function (ctx: Context, _session: Session, _opts: { req: Request }) {
    return new Response(ctx.fns.procs.ui.mark({}), {
        headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" },
    });
}
