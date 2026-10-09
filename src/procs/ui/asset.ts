// The url a layout links a browser script by — the path, plus the one number
// that changes when this process does.
//
// A cache header is a request, not a rule: with no validator to check, a browser
// is free to keep what it has, and reloading the page does not re-ask for a
// script it believes is fresh. That is how a tab kept running the events client
// from before the stream was moved off the page load — the one that leaves the
// tab's loading indicator turning for as long as the tab is open — through
// reload after reload, and how a page can call `window.chat.compose` on a copy
// of the file that has no such function.
//
// A query the process stamps ends it: a new run is a new url, and a new url
// cannot be answered from the old run's cache. Every `<script src>` a layout
// writes goes through here.
export default function (ctx: Context, _session: Session | null, opts: { href: string }): string {
    const started = ((ctx.state as any).procs.started ??= Date.now());
    return `${opts.href}${opts.href.includes("?") ? "&" : "?"}v=${started}`;
}
