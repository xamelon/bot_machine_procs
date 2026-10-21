export default function (ctx: Context, _session: Session | null, opts: {
    name: string; values?: string[]; placeholder?: string; suggestions?: string[]; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/tokenizer.js" });
    const tokenSrc = ctx.fns.procs.ui.asset({ href: "/procs/ui/token.js" });
    const values = opts.values ?? [];
    const tokens = values.map(v => ctx.fns.procs.ui.token({ label: v, removable: true, attrs: `data-value="${esc(v)}"`, removeAttrs: `data-asx-token-remove="${esc(v)}"` })).join("");
    const hidden = values.map(v => `<input type="hidden" name="${esc(opts.name)}" value="${esc(v)}" data-asx-token-hidden>`).join("");
    const suggestions = JSON.stringify(opts.suggestions ?? []);
    return `<div class="asx-tokenizer ${esc(opts.class ?? "")}" data-asx-tokenizer data-name="${esc(opts.name)}" data-suggestions="${esc(suggestions)}">
        <div class="asx-tokenizer__box" data-asx-token-box>${tokens}<input data-asx-token-input placeholder="${esc(opts.placeholder ?? "Add token…")}" autocomplete="off"></div>
        <div data-asx-token-hidden-box>${hidden}</div>
        <div class="asx-tokenizer__menu" data-asx-token-menu hidden></div>
        <script src="${esc(tokenSrc)}" defer></script>
        <script src="${esc(src)}" defer></script>
    </div>`;
}
