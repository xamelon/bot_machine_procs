export default function (ctx: Context, _session: Session | null, opts: { row: any; errors?: string[] }) {
    const row = opts.row;
    const errors = opts.errors ?? [];
    const actions = Object.keys(ctx.state.procs?.hooks?.handlers ?? {}).filter((name) => name.startsWith("bot.action.")).map((name) => name.slice("bot.action.".length)).sort();
    const data = JSON.stringify({ definition: JSON.parse(row.definition), actions }).replaceAll("<", "\\u003c");
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const error = errors.length ? `<section class="editor-errors"><strong>Cannot save</strong><ul>${errors.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></section>` : "";
    return {
        title: row.name,
        headExtra: `<link rel="stylesheet" href="/bot/reactflow.css"><link rel="stylesheet" href="/bot/editor.css"><script src="/bot/editor.js" defer></script>`,
        main: `<div class="flow-editor-page" data-page="bot-flow">${error}<section class="flow-editor-panel"><div class="flow-editor-page__bar">${ctx.fns.procs.ui.button({ label: "Flows", href: "/bot/flows", variant: "ghost", icon: "ph-arrow-left" })}<strong>${esc(row.name)}</strong><span class="flow-editor-page__actions">${ctx.fns.procs.ui.button({ label: "Backup", href: `/bot/flows/${row.id}/backup`, size: "sm" })}<button class="asx-button" data-variant="primary" data-size="sm" type="submit" form="flow-editor-form"><span class="asx-button__label">Save</span></button></span></div><form id="flow-editor-form" method="post" action="/bot/flows/${row.id}"><input type="hidden" name="updated_at" value="${esc(row.updated_at)}"><textarea id="flow-editor-definition" name="definition" hidden></textarea></form><div id="flow-editor" class="flow-editor"></div><script type="application/json" id="flow-editor-data">${data}</script></section></div>`,
    };
}
