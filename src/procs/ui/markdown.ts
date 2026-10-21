export default function (ctx: Context, _session: Session | null, opts: { markdown: string; class?: string }) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const html = sanitizeMarkdownHtml(Bun.markdown.html(opts.markdown));
    return `<article class="asx-markdown ${esc(opts.class ?? "")}">${html}</article>`;
}

function sanitizeMarkdownHtml(html: string): string {
    return html
        .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
        .replace(/<\/?(?:script|style|iframe|object|embed)\b[^>]*>/gi, "")
        .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "")
        .replace(/\s+(href|src)\s*=\s*javascript:[^\s>]+/gi, "");
}
