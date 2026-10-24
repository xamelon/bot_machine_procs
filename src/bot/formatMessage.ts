// Node texts use a small Markdown subset. Convert only at the platform boundary;
// never overwrite the source in flows/outbox. Explicit plain text is an escape hatch.
//   max      → Markdown as is (`format: "markdown"`), MAX renders it itself;
//   telegram → Telegram's HTML subset (`parseMode: "HTML"`): only `< > &` need
//              escaping there, unlike MarkdownV2 where almost every sign does;
//   vk       → plain text: VK has no formatting for bot messages.
export default function (_ctx: Context, _session: Session | null, opts: { channel: string; text?: string; format?: string }) {
    const text = opts.text ?? "";
    if (opts.format === "plain") return { text };
    if (opts.channel === "max") return { text, format: opts.format ?? "markdown" };
    if (opts.channel === "telegram") {
        if (opts.format === "html") return { text, parseMode: "HTML" };
        if (opts.format && opts.format !== "markdown") return { text };
        return { text: render(text, telegram), parseMode: "HTML" };
    }
    if (opts.channel !== "vk" || (opts.format && opts.format !== "markdown")) return { text };
    return { text: render(text, vk) };
}

type Callbacks = Parameters<typeof Bun.markdown.render>[1];

const withUrl = (label: string, url: string) => label === url || !label ? url : `${label} — ${url}`;

// Layout both channels share: blocks separated by a blank line, lists as text markers.
const blocks: Callbacks = {
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
    hr: () => "\n———\n\n",
    tr: (children) => `${children.trimEnd()}\n`,
    th: (children) => `${children}  `,
    td: (children) => `${children}  `,
};

const vk: Callbacks = {
    ...blocks,
    link: (children, meta) => withUrl(children, meta.href),
    image: (children, meta) => withUrl(children, meta.src),
};

// https://core.telegram.org/bots/api#html-style — every text run arrives raw, so it is escaped here.
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s: string) => escape(s).replace(/"/g, "&quot;");
const telegram: Callbacks = {
    ...blocks,
    text: escape,
    heading: (children) => `<b>${children}</b>\n\n`,
    strong: (children) => `<b>${children}</b>`,
    emphasis: (children) => `<i>${children}</i>`,
    strikethrough: (children) => `<s>${children}</s>`,
    codespan: (children) => `<code>${children}</code>`,
    code: (children, meta) => meta?.language
        ? `<pre><code class="language-${attr(meta.language)}">${children.trimEnd()}</code></pre>\n\n`
        : `<pre>${children.trimEnd()}</pre>\n\n`,
    blockquote: (children) => `<blockquote>${children.trim()}</blockquote>\n\n`,
    link: (children, meta) => `<a href="${attr(meta.href)}">${children || escape(meta.href)}</a>`,
    image: (children, meta) => `<a href="${attr(meta.src)}">${children || escape(meta.src)}</a>`,
};

function render(text: string, callbacks: Callbacks) {
    const rendered = Bun.markdown.render(text, callbacks, { noHtmlBlocks: true, noHtmlSpans: true });
    return rendered.replace(/\n{3,}/g, "\n\n").trim();
}
