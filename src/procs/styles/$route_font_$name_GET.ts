// GET /procs/styles/font/<name>.woff2 — the interface typeface, served by us.
//
// Self-hosted rather than linked at Google: a clinical deploy should not have to
// reach a third party to draw its own text, the font is then one less thing that
// can be blocked, slow or logged elsewhere, and the bytes are pinned in the
// repository instead of being whatever that CDN serves today.
//
// Three subsets, ~79 KB together, each `font-display: swap` behind a
// `unicode-range` — so a page of Russian pulls the Cyrillic file and nothing
// else, and text is on screen in the first frame either way.
//
// Cached for a year and immutable: the file name is the version. A new cut of
// the font is a new name, never a new body under the same one.
export default async function (_ctx: Context, _session: Session, opts: { params: { name: string } }) {
    // The name is a url segment, so it is matched against what exists rather
    // than joined onto a path — `../../etc/passwd` is a 404 here, not a read.
    const name = String(opts.params?.name ?? "").replace(/\.woff2$/, "");
    if (!SUBSETS.includes(name)) return new Response("no such font", { status: 404 });

    const file = Bun.file(new URL(`../../../assets/fonts/golos-text-${name}.woff2`, import.meta.url));
    if (!(await file.exists())) return new Response("no such font", { status: 404 });

    return new Response(file, {
        headers: { "content-type": "font/woff2", "cache-control": "public, max-age=31536000, immutable" },
    });
}

const SUBSETS = ["cyrillic", "latin", "latin-ext"];
