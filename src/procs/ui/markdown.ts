// One Markdown renderer for pages and chat: native Bun, with model HTML disabled.
export default function (ctx: Context, _session: Session | null, opts: { markdown: string; class?: string; images?: boolean }) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    // With raw HTML disabled the markup/attributes come only from Bun, not the
    // input. Restrict generated URLs too: javascript/data and obfuscated schemes
    // must never become links, even if supplied through Markdown syntax.
    let html = Bun.markdown.html(opts.markdown, { noHtmlBlocks: true, noHtmlSpans: true })
        .replace(/\s+(href|src)="([^"]*)"/gi, (attribute, _name, url) =>
            /^(?:https?:\/\/|mailto:|#|\/(?!\/)|\.{1,2}\/)/i.test(url) ? attribute : "");
    // Chat should not load third-party tracking images from model output.
    if (opts.images === false) html = html.replace(/<img\b[^>]*>/gi, "");
    return `<article class="asx-markdown ${esc(opts.class ?? "")}">${html}</article>`;
}
