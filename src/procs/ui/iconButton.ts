export default function (ctx: Context, _session: Session | null, opts: {
    label: string; icon: string; variant?: "primary" | "secondary" | "ghost" | "destructive"; size?: "sm" | "md" | "lg";
    href?: string; action?: string; post?: string; get?: string; target?: string; swap?: string; disabled?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const variant = opts.variant ?? "ghost";
    const size = opts.size ?? "md";
    const attrs = [
        `class="asx-button asx-icon-button ${esc(opts.class ?? "")}"`,
        `data-variant="${esc(variant)}"`,
        `data-size="${esc(size)}"`,
        `aria-label="${esc(opts.label)}"`,
        opts.action ? ctx.fns.procs.ui.attr({ action: opts.action }) : "",
        opts.disabled ? `disabled aria-disabled="true"` : "",
    ].filter(Boolean).join(" ");
    const hx = opts.post ? ` hx-post="${esc(opts.post)}"` : opts.get ? ` hx-get="${esc(opts.get)}"` : "";
    const target = hx ? ` hx-target="${esc(opts.target ?? "#main")}" hx-swap="${esc(opts.swap ?? "innerHTML")}"` : "";
    const body = `<span class="asx-button__icon"><i class="ph ${esc(opts.icon)}" aria-hidden="true"></i></span>`;
    if (opts.href && !opts.disabled) return `<a ${attrs} href="${esc(opts.href)}"${hx}${target}>${body}</a>`;
    return `<button ${attrs} type="button"${hx}${target}>${body}</button>`;
}
