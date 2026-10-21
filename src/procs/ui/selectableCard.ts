export default function (ctx: Context, _session: Session | null, opts: {
    title?: string; body: string; name?: string; value?: string; selected?: boolean; variant?: "accent" | "blue" | "purple" | "teal" | "success" | "warning" | "error"; elevation?: "none" | "low" | "med"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const input = opts.name ? `<input class="asx-selectable-card__input" type="checkbox" name="${esc(opts.name)}" value="${esc(opts.value ?? "on")}"${opts.selected ? " checked" : ""}>` : "";
    return `<label class="asx-selectable-card ${esc(opts.class ?? "")}" data-selected="${opts.selected ? "true" : "false"}" data-variant="${esc(opts.variant ?? "accent")}" data-elevation="${esc(opts.elevation ?? "none")}">
        ${input}
        ${opts.title ? `<div class="asx-selectable-card__title">${esc(opts.title)}</div>` : ""}
        <div class="asx-selectable-card__body">${opts.body}</div>
    </label>`;
}
