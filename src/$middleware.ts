// Who is asking. The supervisor signs operators in and forwards each request
// with `x-bot-user` (it always replaces a client's own), so this only reads it
// into `session.user` — which then reaches every ctx.fns call and log line.
//
// No header means no supervisor in front (a bare `start:runtime`, a test, or
// CONTROL_AUTH=open): there is no sign-in to speak of, and `team.can` allows
// everything, exactly as before accounts existed.
//
// A public path (`/<module>/public/…`, see supervisor/public.ts) arrives marked
// `x-bot-access: public` and never with a user: `session.public` makes
// `team.can` refuse everything, so such a page cannot show admin chrome.
export default function (_ctx: Context, session: Session, opts: { req: Request }) {
    if (opts.req.headers.get("x-bot-access") === "public") { session.public = true; return; }
    const raw = opts.req.headers.get("x-bot-user");
    if (!raw) return;
    try {
        const user = JSON.parse(decodeURIComponent(raw));
        if (typeof user?.id === "string" && typeof user?.role === "string") {
            session.user = { sub: user.id, id: user.id, login: String(user.login ?? ""), name: String(user.name ?? user.login ?? ""), role: user.role };
        }
    } catch { /* malformed: nobody */ }
}
