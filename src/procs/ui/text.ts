export default function (ctx: Context, _session: Session | null, opts: {
    children?: string; text?: string; tone?: "primary" | "secondary" | "disabled" | "success" | "warning" | "error"; size?: "supporting" | "body" | "label"; weight?: "regular" | "medium" | "semibold"; as?: "span" | "p" | "div"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const tag = opts.as ?? "span";
    return `<${tag} class="asx-text ${esc(opts.class ?? "")}" data-tone="${esc(opts.tone ?? "primary")}" data-size="${esc(opts.size ?? "body")}" data-weight="${esc(opts.weight ?? "regular")}">${opts.children ?? esc(opts.text ?? "")}</${tag}>`;
}
