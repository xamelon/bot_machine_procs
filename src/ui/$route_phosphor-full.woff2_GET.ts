// GET /ui/phosphor-full.woff2 — the icon glyphs themselves, all 1530 of them.
//
// The whole set rather than a cut of the icons in use: any `ph-*` name from
// phosphoricons.com draws, with no font rebuild. 147 KB once, then the browser cache.
//
// Cached for a year and immutable, the same rule as the interface typeface: the
// name is the version, so a new icon set is a new file, never new bytes under an
// old address (the subset used to live at /ui/phosphor.woff2 — browsers still
// hold it, which is why this one has a new name). WOFF2 is already compressed —
// the gzip step skips it by type.
export default async function () {
    const file = Bun.file(new URL("../../assets/icons/phosphor-full.woff2", import.meta.url));
    if (!(await file.exists())) return new Response("no icon font", { status: 404 });
    return new Response(file, {
        headers: { "content-type": "font/woff2", "cache-control": "public, max-age=31536000, immutable" },
    });
}
