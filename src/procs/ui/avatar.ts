export default function (ctx: Context, _session: Session | null, opts: {
    name: string; src?: string; size?: "sm" | "md" | "lg"; status?: "success" | "warning" | "error" | "neutral"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const initials = opts.name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();
    return `<span class="asx-avatar ${esc(opts.class ?? "")}" data-size="${esc(opts.size ?? "md")}" title="${esc(opts.name)}">${opts.src ? `<img src="${esc(opts.src)}" alt="${esc(opts.name)}">` : `<span>${esc(initials)}</span>`}${opts.status ? ctx.fns.procs.ui.statusDot({ tone: opts.status, class: "asx-avatar__status" }) : ""}</span>`;
}
