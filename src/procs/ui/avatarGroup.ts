export default function (ctx: Context, _session: Session | null, opts: {
    items: Array<{ name: string; src?: string }>; max?: number; size?: "sm" | "md" | "lg"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const max = opts.max ?? 4;
    const shown = opts.items.slice(0, max).map(i => ctx.fns.procs.ui.avatar({ ...i, size: opts.size ?? "md" })).join("");
    const extra = opts.items.length > max ? `<span class="asx-avatar asx-avatar--extra" data-size="${esc(opts.size ?? "md")}">+${opts.items.length - max}</span>` : "";
    return `<span class="asx-avatar-group ${esc(opts.class ?? "")}">${shown}${extra}</span>`;
}
