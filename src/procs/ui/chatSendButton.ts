export default function (ctx: Context, _session: Session | null, opts: {
    label?: string; stop?: boolean; disabled?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<button class="asx-chat-send-button ${esc(opts.class ?? "")}" type="submit" data-stop="${opts.stop ? "true" : "false"}" aria-label="${esc(opts.label ?? (opts.stop ? "Stop" : "Send"))}"${opts.disabled ? " disabled" : ""}><i class="ph ${opts.stop ? "ph-stop" : "ph-arrow-up"}" aria-hidden="true"></i></button>`;
}
