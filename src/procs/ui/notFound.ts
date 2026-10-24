// What is behind a url that answers nothing — as a page, not as four bytes.
//
// A miss used to be `new Response("Not Found", { status: 404 })`, and a handler
// that knew more said it in prose: `no such patient: seed-anna`. Both replace the
// window with plain text on a white background — no rail, no tab strip, no way
// back except the browser's own — and under htmx they are worse still, because
// that text lands *inside* `#main` and the app is left with a sentence where a
// screen was.
//
// So a miss returns a value like any other page and `toResponse` dresses it: the
// host's layout on a full load, the fragment plus the chrome on a swap. `what`
// is the thing that was looked for in the words of whoever looked (`patient
// seed-anna`), because "Not Found" alone never says *what* was not found.
export default function (ctx: Context, _session: Session | null, opts: { what?: string; url?: string; back?: { label: string; href: string } }) {
    const ui = ctx.fns.procs.ui;
    const what = opts.what?.trim();
    const back = opts.back;

    return {
        title: "Not found",
        status: 404,
        main: ctx.fns.procs.ui.page({
            page: "not-found",
            title: "Not found",
            main: ctx.fns.procs.ui.banner({
                tone: "warning",
                body: what ? `There is no ${what}.` : "There is nothing at this address.",
            }) + (opts.url ? ui.text({ as: "p", size: "supporting", tone: "secondary", children: ui.code({ code: opts.url }) }) : "")
                + (back ? ui.button({ label: back.label, icon: "ph-arrow-left", href: back.href, get: back.href, push: true, variant: "ghost", size: "sm", action: "back", id: "not-found" }) : ""),
        }),
    };
}
