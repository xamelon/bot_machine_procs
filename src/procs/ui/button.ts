const VARIANT = { primary: "primary", secondary: "secondary", ghost: "ghost", destructive: "destructive" } as const;
const SIZE = { sm: "sm", md: "md", lg: "lg" } as const;

const TONE = { primary: "primary", secondary: "secondary", default: "secondary", ghost: "ghost", danger: "destructive", destructive: "destructive" } as const;

export default function (ctx: Context, _session: Session | null, opts: {
    label: string; variant?: keyof typeof VARIANT; tone?: keyof typeof TONE; size?: keyof typeof SIZE | "xs"; icon?: string; end?: string;
    href?: string; action?: string; entity?: string; id?: string; post?: string; get?: string; vals?: Record<string, any>; confirm?: string;
    target?: string; swap?: string; push?: boolean; trigger?: string;
    disabled?: boolean; type?: "button" | "submit" | "reset"; name?: string; value?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const variant = opts.variant ?? TONE[opts.tone ?? "secondary"] ?? "secondary";
    const size = opts.size === "xs" ? "sm" : opts.size ?? "md";
    const attrs = [
        `class="asx-button ${esc(opts.class ?? "")}"`,
        `data-variant="${esc(variant)}"`,
        `data-size="${esc(size)}"`,
        ctx.fns.procs.ui.attr({ action: opts.action, entity: opts.entity, id: opts.id }),
        opts.disabled ? `disabled aria-disabled="true"` : "",
        opts.name ? `name="${esc(opts.name)}"` : "",
        opts.value != null ? `value="${esc(opts.value)}"` : "",
    ].filter(Boolean).join(" ");
    const hx = opts.post ? ` hx-post="${esc(opts.post)}"` : opts.get ? ` hx-get="${esc(opts.get)}"` : "";
    const vals = opts.vals ? ` hx-vals="${esc(JSON.stringify(opts.vals))}"` : "";
    const fires = hx && opts.trigger ? ` hx-trigger="${esc(opts.trigger)}"` : "";
    const ask = opts.confirm ? ` hx-confirm="${esc(opts.confirm)}"` : "";
    const target = hx ? ` hx-target="${esc(opts.target ?? "#main")}" hx-swap="${esc(opts.swap ?? "innerHTML")}"${opts.push ? ` hx-push-url="true"` : ""}` : "";
    const body = `${opts.icon ? `<span class="asx-button__icon"><i class="ph ${esc(opts.icon)}" aria-hidden="true"></i></span>` : ""}<span class="asx-button__label">${esc(opts.label)}</span>${opts.end ? `<span class="asx-button__end">${opts.end}</span>` : ""}`;
    if (opts.href && !opts.disabled) return `<a ${attrs} href="${esc(opts.href)}"${hx}${vals}${fires}${target}${ask}>${body}</a>`;
    return `<button ${attrs} type="${esc(opts.type ?? "button")}"${hx}${vals}${fires}${target}${ask}>${body}</button>`;
}
