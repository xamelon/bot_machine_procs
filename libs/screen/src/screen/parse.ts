// Parse rendered HTML into the semantic vocabulary shared by screen actions,
// tours and server-side acceptance checks. One wildcard handler owns each
// element's single onEndTag callback: HTMLRewriter does not compose competing
// end callbacks reliably, and competing marker/link/diagnostic handlers once
// leaked a previous field onto the next action.
const KEYS = ["page", "section", "entity", "id", "status", "role", "form", "action", "field"] as const;
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const SUPPRESSED = new Set(["script", "style", "noscript", "template"]);
const SEPARATE = new Set(["a", "address", "article", "aside", "blockquote", "br", "button", "caption", "dd", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "input", "label", "li", "main", "nav", "ol", "option", "p", "pre", "section", "select", "span", "summary", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "tr", "ul"]);
const INTERACTIVE = new Set(["a", "button", "input", "select", "textarea", "form"]);

export default async function (_ctx: Context, _session: Session | null, opts: { html: string; scope?: "main" | "body" }) {
    const scope = opts.scope ?? "body";
    const markers: types.screen.Marker[] = [];
    const markerStack: number[] = [];
    const headings: Array<{ level: number; text: string }> = [];
    const headingStack: Array<{ level: number; text: string }> = [];
    const pageLinks: Array<{ href: string; text: string }> = [];
    const linkStack: Array<{ href: string; text: string; owners: number[] }> = [];
    const diagnostics: Array<{ code: string; tag?: string; text?: string; href?: string; detail?: string }> = [];
    const interactiveStack: Array<{ tag: string; href?: string; text: string }> = [];
    const tables: Array<{ columns: string[]; rows: Array<{ entity?: string; id?: string; status?: string; cells: Record<string, string>; text: string }> }> = [];
    const tableStack: Array<(typeof tables)[number]> = [];
    const rowStack: Array<{ entity?: string; id?: string; status?: string; cells: Record<string, string>; text: string }> = [];
    const cellStack: Array<{ role: string; text: string; heading: boolean }> = [];
    let bodyText = "";
    let inScope = false;
    let suppressed = 0;

    const rewriter = new HTMLRewriter().on("*", {
        element(el) {
            const tag = el.tagName;
            const opensScope = scope === "body" ? tag === "body" : tag === "main" && el.getAttribute("id") === "main";
            if (opensScope) inScope = true;
            const suppresses = inScope && SUPPRESSED.has(tag);
            if (suppresses) suppressed++;
            if (!inScope) return;

            if (SEPARATE.has(tag)) addText(" ");

            const marker: types.screen.Marker = { tag, own: [], links: [], text: "" };
            for (const key of KEYS) {
                const value = el.getAttribute(`data-${key}`);
                if (value !== null) { (marker as any)[key] = value; marker.own.push(key); }
            }
            const hasMarker = marker.own.length > 0;
            let markerIndex: number | undefined;
            if (hasMarker) {
                const href = el.getAttribute("href");
                if (href) marker.href = href;
                if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") marker.disabled = true;
                if (el.hasAttribute("checked") || el.getAttribute("aria-checked") === "true") marker.checked = true;
                const value = el.getAttribute("value");
                if (value !== null) marker.value = value;
                marker.parent = markerStack.at(-1);
                markerIndex = markers.push(marker) - 1;
                if (!VOID.has(tag)) markerStack.push(markerIndex);
            }

            let link: (typeof linkStack)[number] | undefined;
            const href = tag === "a" ? el.getAttribute("href") : null;
            if (href) {
                link = { href, text: "", owners: [...markerStack] };
                linkStack.push(link);
            }

            let heading: (typeof headingStack)[number] | undefined;
            if (/^h[1-6]$/.test(tag)) {
                heading = { level: Number(tag.slice(1)), text: "" };
                headingStack.push(heading);
            }

            let table: (typeof tableStack)[number] | undefined;
            if (tag === "table") { table = { columns: [], rows: [] }; tables.push(table); tableStack.push(table); }
            let row: (typeof rowStack)[number] | undefined;
            if (tag === "tr") {
                row = { entity: el.getAttribute("data-entity") ?? undefined, id: el.getAttribute("data-id") ?? undefined, status: el.getAttribute("data-status") ?? undefined, cells: {}, text: "" };
                rowStack.push(row);
            }
            let cell: (typeof cellStack)[number] | undefined;
            if (tag === "th" || tag === "td") {
                cell = { role: el.getAttribute("data-role") ?? `column-${cellStack.length}`, text: "", heading: tag === "th" };
                cellStack.push(cell);
            }

            const nativeInteractive = INTERACTIVE.has(tag) && !(tag === "input" && el.getAttribute("type") === "hidden");
            const wiredInteractive = nativeInteractive || el.getAttribute("role") === "button" || el.hasAttribute("onclick") || el.hasAttribute("hx-get") || el.hasAttribute("hx-post");
            const usefulAncestor = markerStack.some(index => markers[index]!.own.some(key => key === "entity" || key === "action" || key === "form" || key === "field"));
            let interactive: (typeof interactiveStack)[number] | undefined;
            if (wiredInteractive && !hasMarker && !usefulAncestor) {
                interactive = { tag, href: el.getAttribute("href") ?? undefined, text: "" };
                if (VOID.has(tag)) diagnostics.push({ code: "interactive-without-marker", tag, href: interactive.href });
                else interactiveStack.push(interactive);
            }

            if (VOID.has(tag)) return;
            el.onEndTag(() => {
                if (interactive) {
                    remove(interactiveStack, interactive);
                    diagnostics.push({ code: "interactive-without-marker", tag, href: interactive.href, text: compact(interactive.text) });
                }
                if (cell) {
                    remove(cellStack, cell);
                    const text = compact(cell.text);
                    if (cell.heading) tableStack.at(-1)?.columns.push(text);
                    else { const current = rowStack.at(-1); if (current) { current.cells[cell.role] = text; current.text = compact(`${current.text} ${text}`); } }
                }
                if (row) { remove(rowStack, row); if (Object.keys(row.cells).length) tableStack.at(-1)?.rows.push(row); }
                if (table) remove(tableStack, table);
                if (heading) { remove(headingStack, heading); headings.push({ ...heading, text: compact(heading.text) }); }
                if (link) {
                    remove(linkStack, link);
                    const shown = { href: link.href, text: compact(link.text) };
                    pageLinks.push(shown);
                    for (const owner of link.owners) { const m = markers[owner]; if (m) { m.links.push(shown); m.href ??= link.href; } }
                }
                if (markerIndex !== undefined) remove(markerStack, markerIndex);
                if (suppresses) suppressed = Math.max(0, suppressed - 1);
                if (opensScope) inScope = false;
            });
        },
    }).onDocument({
        text(chunk) { if (!inScope) return; addText(chunk.text); },
    });

    function addText(text: string) {
        if (!suppressed) bodyText += text;
        for (const index of markerStack) if (markers[index]) markers[index]!.text += text;
        for (const link of linkStack) link.text += text;
        for (const heading of headingStack) heading.text += text;
        for (const cell of cellStack) cell.text += text;
        for (const interactive of interactiveStack) interactive.text += text;
    }

    await rewriter.transform(new Response(opts.html)).text();
    for (const marker of markers) marker.text = compact(marker.text);
    for (const marker of markers.filter(marker => marker.action)) inheritContext(marker, markers);
    if (!markers.some(marker => marker.own.includes("page"))) diagnostics.push({ code: "missing-page-marker" });
    const identities = new Map<string, number>();
    for (const marker of markers.filter(marker => marker.action || marker.entity)) {
        const key = marker.action ? `action:${marker.action}:${marker.id ?? ""}:${marker.entity ?? ""}` : `entity:${marker.entity}:${marker.id ?? ""}`;
        identities.set(key, (identities.get(key) ?? 0) + 1);
    }
    for (const [detail, count] of identities) if (count > 1 && !/^(action|entity):[^:]+::$/.test(detail)) diagnostics.push({ code: "duplicate-descriptor", detail: `${detail} (${count})` });
    return { markers, headings, links: dedupeLinks(pageLinks), tables, diagnostics, text: compact(bodyText) };
}

function inheritContext(marker: types.screen.Marker, markers: types.screen.Marker[]) {
    let parent = marker.parent;
    while (parent !== undefined) {
        const owner = markers[parent];
        if (!owner) break;
        if (owner.own.includes("form")) marker.form ??= owner.form;
        if (owner.own.includes("field")) marker.field ??= owner.field;
        if (!marker.entity && owner.own.includes("entity") && owner.id) { marker.entity = owner.entity; marker.id ??= owner.id; }
        parent = owner.parent;
    }
}
function compact(value: string): string { return value.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim(); }
function remove<T>(items: T[], item: T) { const at = items.lastIndexOf(item); if (at >= 0) items.splice(at, 1); }
function dedupeLinks(links: Array<{ href: string; text: string }>) {
    const seen = new Set<string>();
    return links.filter(link => { const key = `${link.href}\0${link.text}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
