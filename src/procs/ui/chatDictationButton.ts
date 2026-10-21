export default function (ctx: Context, _session: Session | null, opts: {
    listening?: boolean;
    supported?: boolean;
    hiddenWhenUnsupported?: boolean;
    label?: string;
    size?: "sm" | "md";
    class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    if (opts.supported === false && opts.hiddenWhenUnsupported !== false) return "";
    const label = opts.label ?? (opts.listening ? "Stop dictation" : "Start dictation");
    const bars = Array.from({ length: 5 }, (_, i) => `<span style="--asx-chat-dictation-scale:${opts.listening ? (0.25 + ((i * 37) % 70) / 100).toFixed(2) : "0.08"}"></span>`).join("");
    return `<span class="asx-chat-dictation-button ${esc(opts.class ?? "")}" data-size="${esc(opts.size ?? "md")}" data-listening="${opts.listening ? "true" : "false"}">
        ${opts.listening ? `<span class="asx-chat-dictation-button__bars" aria-hidden="true">${bars}</span>` : ""}
        ${ctx.fns.procs.ui.button({ label, variant: "ghost", size: opts.size ?? "md", icon: "ph-microphone", class: "asx-chat-dictation-button__button" })}
    </span>`;
}
