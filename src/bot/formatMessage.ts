// Node texts use a small Markdown subset. Convert only at the platform boundary;
// never overwrite the source in flows/outbox. Explicit plain text is an escape hatch.
export default function (_ctx: Context, _session: Session | null, opts: { channel: string; text?: string; format?: string }) {
    const text = opts.text ?? "";
    if (opts.format === "plain") return { text };
    if (opts.channel === "max") return { text, format: opts.format ?? "markdown" };
    if (opts.channel !== "vk" || (opts.format && opts.format !== "markdown")) return { text };

    const withUrl = (label: string, url: string) => label === url || !label ? url : `${label} — ${url}`;
    const rendered = Bun.markdown.render(text, {
        heading: (children) => `${children}\n\n`,
        paragraph: (children) => `${children}\n\n`,
        blockquote: (children) => `${children.trim()}\n\n`,
        code: (children) => `${children.trimEnd()}\n\n`,
        list: (children, meta) => `${meta.depth ? "\n" : ""}${children.trimEnd()}\n${meta.depth ? "" : "\n"}`,
        listItem: (children, meta) => {
            const marker = meta.ordered ? `${(meta.start ?? 1) + meta.index}.` : "•";
            const checked = meta.checked === undefined ? "" : meta.checked ? "[✓] " : "[ ] ";
            return `${"  ".repeat(meta.depth)}${marker} ${checked}${children.trim()}\n`;
        },
        link: (children, meta) => withUrl(children, meta.href),
        image: (children, meta) => withUrl(children, meta.src),
        hr: () => "\n———\n\n",
        tr: (children) => `${children.trimEnd()}\n`,
        th: (children) => `${children}  `,
        td: (children) => `${children}  `,
    }, { noHtmlBlocks: true, noHtmlSpans: true });
    return { text: rendered.replace(/\n{3,}/g, "\n\n").trim() };
}
