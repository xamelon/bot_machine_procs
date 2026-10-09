// Inlined at build time (text import) so the prod bundle serves it with no
// filesystem read — a single dist/app.js is fully self-contained.
import clientJs from "./client.js" with { type: "text" };

// Revalidate every time, like every `$script_*` the framework serves. This
// answer carried no cache headers at all, and a response with no `Cache-Control`
// and no validator is one the browser may cache on a guess — which is how a tab
// kept running the version of this file that opened the stream during the load
// and span its loading indicator forever, days after that was fixed, through
// reload after reload.
export default function (_ctx: Context, _session: Session, _opts: { req: Request }) {
    return new Response(clientJs as unknown as string, {
        headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" },
    });
}
