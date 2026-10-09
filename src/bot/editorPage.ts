export default function (ctx: Context, _session: Session | null, opts: { row: any; errors?: string[] }) {
    const row = opts.row;
    const errors = opts.errors ?? [];
    const actions = Object.keys(ctx.state.procs?.hooks?.handlers ?? {}).filter((name) => name.startsWith("bot.action.")).map((name) => name.slice("bot.action.".length)).sort();
    const data = JSON.stringify({ definition: JSON.parse(row.definition), actions }).replaceAll("<", "\\u003c");
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const error = errors.length ? `<section class="editor-errors"><strong>Cannot save</strong><ul>${errors.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></section>` : "";
    const main = `${error}<section class="flow-editor-panel"><form id="flow-editor-form" method="post" action="/bot/flows/${row.id}"><input type="hidden" name="updated_at" value="${esc(row.updated_at)}"><textarea id="flow-editor-definition" name="definition" hidden></textarea></form><div id="flow-editor" class="flow-editor"></div><script type="application/json" id="flow-editor-data">${data}</script></section>`;
    return {
        title: row.name,
        headExtra: `<link rel="stylesheet" href="/bot/reactflow.css"><link rel="stylesheet" href="/bot/editor.css"><script src="/bot/editor.js" defer></script>`,
        main: `<p class="mb-3 flex items-center justify-between gap-3"><a href="/bot/flows">← Flows</a><span class="flex gap-2"><a class="btn btn-sm" href="/bot/flows/${row.id}/backup">Backup</a><button class="btn btn-sm btn-primary" type="submit" form="flow-editor-form">Save</button></span></p>${ctx.fns.procs.ui.page({ page: "bot-flow", title: row.name, lead: "Сохраняет текущий flow. Custom actions выбираются из registry.", main })}`,
    };
}
