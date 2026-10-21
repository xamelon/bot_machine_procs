// Default bot_procs shell: bot navigation, admin, durable coding conversation.
export default function (ctx: Context, session: Session | null, opts: { title?: string; main: string; headExtra?: string }) {
    const nav = ctx.fns.bot.nav({ path: session?.url?.pathname ?? "/" });
    const ui = ctx.fns.procs.ui;
    const templates = (["user", "assistant", "system"] as const).map(sender =>
        `<template data-agent-message="${sender}">${ui.chatMessage({ sender, author: sender === "user" ? "You" : "Pi", variant: sender === "assistant" ? "ghost" : "filled", body: "", avatar: "none" })}</template>`
    ).join("");
    const composer = ui.chatComposer({
        name: "text",
        input: ui.chatComposerInput({ name: "text", placeholder: "Describe a change…" })
            .replace("<textarea", '<textarea id="agent-prompt" required'),
        header: '<label for="agent-prompt">Change this bot</label>',
        actions: ui.button({ label: "Stop", name: "stop", size: "sm", variant: "ghost" }),
        status: { type: "error", message: "" },
    }).replace('class="asx-chat-composer__status"', 'data-agent-error role="alert" hidden class="asx-chat-composer__status"');
    const collapse = ui.button({ label: "Collapse chat", icon: "ph-caret-double-right", variant: "ghost", size: "sm", class: "agent-collapse" }).replace('<button', '<button data-agent-collapse aria-controls="coding-agent" aria-expanded="true" title="Collapse chat"');
    const reopen = ui.button({ label: "Chat", icon: "ph-chat-circle", variant: "ghost", size: "sm" }).replace('<button', '<button data-agent-open aria-controls="coding-agent" aria-expanded="false" aria-label="Open chat" title="Open chat"');
    const panel = `<aside id="coding-agent" class="agent-panel" aria-label="Coding agent">${ui.chatLayout({
        header: `<div class="agent-header"><strong>Pi</strong><span data-agent-status role="status">Connecting…</span>${ctx.fns.ui.providers()}<a href="/_control/">Recovery</a>${collapse}</div>`,
        body: ui.chatMessageList({ align: "top" }).replace('class="asx-chat-message-list__inner"', 'data-agent-messages aria-label="Conversation" class="asx-chat-message-list__inner"'),
        composer,
    })}${templates}</aside>`;
    const main = `<main id="main" class="p-6">${opts.main}</main>`;
    const workspace = ui.resizable({ class: "bot-workspace", initial: 70, min: 35, max: 85, start: main, end: `${panel}<div class="agent-rail" hidden>${reopen}</div>` });
    const html = ui.layout({ ...opts, headExtra: `${opts.headExtra ?? ""}<link rel="preload" href="/ui/phosphor.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/ui/phosphor.css"><link rel="stylesheet" href="/ui/agent.css"><script src="/ui/agent.js" defer></script><script src="/ui/workbench.js" defer></script>` });
    return html.replace(main, () => `<div class="bot-workbench">${nav}${workspace}</div>`);
}
