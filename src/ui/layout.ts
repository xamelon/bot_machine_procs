// Default bot_procs shell: bot navigation, admin, durable coding conversation.
export default function (ctx: Context, session: Session | null, opts: { title?: string; main: string; headExtra?: string }) {
    const ui = ctx.fns.procs.ui;
    // A public page (a buyer, a provider) gets a bare page: no admin menu, no
    // account, no Pi, no scripts or event stream — and only the framework's
    // stylesheets, the assets the supervisor serves without signing in.
    if (session?.public) {
        const esc = (s: any) => ui.escape({ text: s });
        const sheets = (ctx.state.procs?.styles ?? []).filter((s: any) => s.href.startsWith("/procs/")).map((s: any) => `<link rel="stylesheet" href="${esc(s.href)}">`).join("");
        return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(opts.title ?? "")}</title><link rel="icon" href="/procs/ui/favicon.svg" type="image/svg+xml">${sheets}</head><body><main id="main" class="asx-main asx-main--reading">${opts.main}</main></body></html>`;
    }
    const nav = ctx.fns.bot.nav({ path: session?.url?.pathname ?? "/" });
    const templates = (["user", "assistant", "system"] as const).map(sender =>
        `<template data-agent-message="${sender}">${ui.chatMessage({ sender, author: sender === "user" ? "You" : "Pi", variant: sender === "assistant" ? "ghost" : "filled", body: "", avatar: "none" })}</template>`
    ).join("");
    const toolTemplate = `<template data-agent-tool>${ui.chatToolCalls({ batch: true, calls: [{ name: "", status: "pending" }] })}</template>`;
    const composer = ui.chatComposer({
        name: "text",
        input: ui.chatComposerInput({ name: "text", placeholder: "Describe a change…" })
            .replace("<textarea", '<textarea id="agent-prompt" required'),
        // Hidden until the agent is actually working: the client shows it from `pi.live.run`.
        actions: ui.button({ label: "Stop", name: "stop", size: "sm", variant: "ghost" }).replace("<button", "<button data-agent-stop hidden"),
        status: { type: "error", message: "" },
    }).replace('class="asx-chat-composer__status"', 'data-agent-error role="alert" hidden class="asx-chat-composer__status"');
    const collapse = ui.button({ label: "Collapse chat", icon: "ph-caret-double-right", variant: "ghost", size: "sm", class: "agent-collapse" }).replace('<button', '<button data-agent-collapse aria-controls="coding-agent" aria-expanded="true" title="Collapse chat"');
    const clear = ui.button({ label: "Clear", icon: "ph-trash", variant: "ghost", size: "sm", class: "agent-clear" }).replace('<button', '<button data-agent-clear title="Clear the conversation (the old one is backed up)"');
    const reopen = ui.button({ label: "Chat", icon: "ph-chat-circle", variant: "ghost", size: "sm" }).replace('<button', '<button data-agent-open aria-controls="coding-agent" aria-expanded="false" aria-label="Open chat" title="Open chat"');
    const panel = `<aside id="coding-agent" class="agent-panel" aria-label="Coding agent">${ui.chatLayout({
        header: `<div class="agent-header"><strong>Pi</strong><span data-agent-status role="status">Connecting…</span>${ctx.fns.ui.providers()}${clear}<a href="/_control/">Recovery</a>${collapse}</div>`,
        body: ui.chatMessageList({ align: "top" }).replace('class="asx-chat-message-list__inner"', 'data-agent-messages aria-label="Conversation" class="asx-chat-message-list__inner"'),
        composer,
    })}${templates}${toolTemplate}</aside>`;
    const main = `<main id="main" class="asx-main">${opts.main}</main>`;
    // Pi edits the application, so only an admin gets the panel (the supervisor
    // refuses /_agent/* to everybody else anyway).
    const agent = ctx.fns.team.can({ permission: "agent" });
    const workspace = agent
        ? ui.resizable({ class: "bot-workspace", initial: 70, min: 35, max: 85, start: main, end: `${panel}<div class="agent-rail" hidden>${reopen}</div>` })
        : `<div class="bot-workspace bot-workspace--solo">${main}</div>`;
    const scripts = `<script src="/ui/drawer.js" defer></script>${agent ? `<script src="/ui/agent.js" defer></script><script src="/ui/workbench.js" defer></script>` : ""}`;
    // Phones: the sidebar becomes a drawer behind this bar (drawer.js). The bar
    // and backdrop are display:none on wider screens.
    const menu = ui.button({ label: "Menu", icon: "ph-list", variant: "ghost", size: "sm" }).replace("<button", '<button data-nav-toggle aria-expanded="false"');
    const bar = `<header class="bot-mobilebar">${menu}<strong data-nav-current>Bot</strong></header><div class="bot-nav-backdrop" data-nav-close></div>`;
    const html = ui.layout({ ...opts, headExtra: `${opts.headExtra ?? ""}<meta name="bot-live-revision" content="${ctx.state.procs.events?.revision ?? 0}"><link rel="preload" href="/ui/phosphor-full.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/ui/phosphor.css"><link rel="stylesheet" href="/ui/agent.css">${scripts}<script src="/ui/live.js" defer></script>` });
    return html.replace(main, () => `<div class="bot-workbench">${bar}${nav}${workspace}</div>`);
}
