export default function (ctx: Context, _session: Session | null, opts: {
    label: string; name?: string; value?: string; pressed?: boolean; icon?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<label class="asx-toggle-button ${esc(opts.class ?? "")}" aria-pressed="${opts.pressed ? "true" : "false"}">
        <input type="checkbox"${opts.name ? ` name="${esc(opts.name)}"` : ""} value="${esc(opts.value ?? "on")}"${opts.pressed ? " checked" : ""}>
        ${opts.icon ? `<i class="ph ${esc(opts.icon)}" aria-hidden="true"></i>` : ""}<span>${esc(opts.label)}</span>
    </label>`;
}
