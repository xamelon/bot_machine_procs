export default function (ctx: Context, _session: Session | null, opts: {
    name?: string; value?: string; placeholder?: string; disabled?: boolean; stop?: boolean; action?: string; method?: string;
    input?: string; drawer?: string; header?: string; footer?: string; actions?: string; sendButton?: string;
    status?: { type: "error" | "warning" | "success"; message: string; position?: "top" | "bottom" };
    density?: "compact" | "balanced" | "spacious"; elevation?: "low" | "none"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/chat.js" });
    const input = opts.input ?? ctx.fns.procs.ui.chatComposerInput({ name: opts.name, value: opts.value, placeholder: opts.placeholder, disabled: opts.disabled });
    const send = opts.sendButton ?? ctx.fns.procs.ui.chatSendButton({ stop: opts.stop, disabled: opts.disabled });
    const statusPosition = opts.status?.position ?? "bottom";
    const status = opts.status ? `<div class="asx-chat-composer__status" data-type="${esc(opts.status.type)}" data-position="${esc(statusPosition)}">${esc(opts.status.message)}</div>` : "";
    return `<form class="asx-chat-composer ${esc(opts.class ?? "")}" data-asx-chat-composer data-density="${esc(opts.density ?? "balanced")}" data-elevation="${esc(opts.elevation ?? "low")}"${opts.action ? ` action="${esc(opts.action)}"` : ""}${opts.method ? ` method="${esc(opts.method)}"` : ""}>
        ${opts.status?.position === "top" ? status : ""}
        ${opts.drawer ? `<div class="asx-chat-composer__drawer">${opts.drawer}</div>` : ""}
        <div class="asx-chat-composer__body">
            ${opts.header ? `<div class="asx-chat-composer__header">${opts.header}</div>` : ""}
            <div class="asx-chat-composer__input-row">${input}</div>
            <div class="asx-chat-composer__footer">${opts.footer ? `<div class="asx-chat-composer__footer-actions">${opts.footer}</div>` : ""}<div class="asx-chat-composer__send-actions">${opts.actions ?? ""}${send}</div></div>
        </div>
        ${!opts.status || opts.status.position === "top" ? "" : status}
        <script src="${esc(src)}" defer></script>
    </form>`;
}
