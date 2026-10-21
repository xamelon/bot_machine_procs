export default function (ctx: Context, _session: Session | null, opts: {
    src?: string; alt?: string; icon?: string; size?: "sm" | "md" | "lg"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<span class="asx-thumbnail ${esc(opts.class ?? "")}" data-size="${esc(opts.size ?? "md")}">${opts.src ? `<img src="${esc(opts.src)}" alt="${esc(opts.alt ?? "")}">` : `<i class="ph ${esc(opts.icon ?? "ph-image")}" aria-hidden="true"></i>`}</span>`;
}
