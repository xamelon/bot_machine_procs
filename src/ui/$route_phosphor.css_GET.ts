// GET /ui/phosphor.css — the icon font's stylesheet, served by us.
//
// It used to be a `<link>` to unpkg.com: a render-blocking third-party request in
// every page's `<head>`, ~280 ms of first paint on this machine, and a page that
// waits on someone else's server (or fails to draw icons at all behind a blocked
// CDN). The bytes are pinned in `assets/icons/`, like the interface typeface, and
// the `@font-face` points at our own `/ui/phosphor.woff2`.
//
// `no-cache`, not `immutable`: the file is small, revalidation is a 304, and a
// new icon set replaces the same two files.
export default async function () {
    const file = Bun.file(new URL("../../assets/icons/phosphor.css", import.meta.url));
    if (!(await file.exists())) return new Response("no icon stylesheet", { status: 404 });
    return new Response(file, {
        headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-cache" },
    });
}
