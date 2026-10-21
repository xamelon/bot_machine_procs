// Keeps the sidebar's active item honest after an htmx navigation.
//
// A boosted link swaps `#main` only — the nav is not re-rendered, so the item the
// server marked active is now the wrong one, and it stays wrong for as long as
// the tab lives. The server cannot fix it either: it answers with a fragment that
// deliberately carries no chrome.
//
// So the rule the server uses (`bot/nav.ts`: exact match, or a prefix that is not
// the dashboard) is applied here, on the url, after every swap and every history
// move. The longest href that equals the path or is its parent wins — `/bot/users`
// beats `/bot`, so the dashboard is not lit up while a page inside it is open.
(() => {
    if (window.__asxNavActive) return;
    window.__asxNavActive = true;

    const mark = () => {
        const path = location.pathname.replace(/\/+$/, "") || "/";
        const items = [...document.querySelectorAll(".asx-nav-item[href]")].map(link => ({
            link, href: (link.getAttribute("href") || "").replace(/\/+$/, "") || "/",
        }));
        let best = null;
        for (const item of items) {
            if (!item.href) continue;
            if (path !== item.href && !path.startsWith(item.href + "/")) continue;
            if (!best || item.href.length > best.href.length) best = item;
        }
        for (const item of items) item.link.setAttribute("data-active", String(item === best));
    };

    // htmx 4 fires `after:swap` for every fragment it lands, and
    // `after:history:push` when the address bar moves without a swap.
    document.addEventListener("htmx:after:swap", mark);
    document.addEventListener("htmx:after:history:push", mark);
    document.addEventListener("htmx:after:history:update", mark);
    // The framework's own event (a process restart, a `reload` broadcast).
    document.addEventListener("hyper-events", mark);
    window.addEventListener("popstate", mark);
    mark();
})();
