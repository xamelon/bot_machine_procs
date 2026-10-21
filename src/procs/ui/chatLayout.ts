export default function (ctx: Context, _session: Session | null, opts: {
    body: string; composer: string; header?: string; scrollButton?: string; density?: "compact" | "balanced" | "spacious"; height?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const style = opts.height ? ` style="height:${esc(opts.height)}"` : "";
    return `<div class="asx-chat-layout ${esc(opts.class ?? "")}" data-density="${esc(opts.density ?? "balanced")}"${style}>
        ${opts.header ? `<div class="asx-chat-layout__header">${opts.header}</div>` : ""}
        <div class="asx-chat-layout__messages">${opts.body}</div>
        <div class="asx-chat-layout__dock">${opts.scrollButton ?? ""}${opts.composer}</div>
    </div>`;
}
