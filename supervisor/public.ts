// What the supervisor lets through without signing in.
//
// A module opens part of itself to the outside under `/<module>/public/…`: a
// payment page a buyer opens, a provider's webhook, a bot's webhook trigger.
// The channel webhooks keep their historical `/bot/webhook/…`.
//
// A public request is anonymous by construction: no session, no `x-bot-user`
// (even for a signed-in admin), and `x-bot-access: public` so the runtime can
// refuse to render anything privileged. Because it carries no ambient
// authority, it needs no Origin check either — which is what lets a third
// party POST to it.
//
// The first segment is a plain module name: `/_agent`, `/_control` and
// `/_auth` can never be made public this way.
//
// A public page also needs the framework's own static files — its stylesheets,
// typeface, scripts, favicon. Those are the same in every installation and
// carry no data, so they are readable (GET/HEAD only) without signing in.
const ASSET = /^\/procs\/(ui|styles)\/(font\/)?[a-z0-9-]+\.(css|js|svg|woff2)$/i;

export function isPublic(pathname: string, method = "GET"): boolean {
    if (/^\/[a-z0-9][a-z0-9-]*\/public(\/|$)/.test(pathname) || pathname.startsWith("/bot/webhook/")) return true;
    return (method === "GET" || method === "HEAD") && ASSET.test(pathname);
}
