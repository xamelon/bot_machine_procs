// A content card — softer than ui.box (no grey strip, a light shadow). A header
// with an optional action, the body, and an optional footer. For a dashboard
// tile or a self-contained panel that is not a list.
//
// `size: "sm"` is the tile in a column — a task, an order — with the padding a
// row has rather than a panel's; `entity`/`id`/`role` mark it the way a row is
// marked, so the workspace can point at it.
export default function (ctx: Context, _session: Session | null, opts: {
    title?: string; actions?: string; body: string; footer?: string; class?: string;
    size?: "sm" | "md"; entity?: string; id?: string; role?: string;
    // A card that says something is wrong, or worth a look: a tint of that
    // colour, and every button in it wears the same colour (`[data-tone]` in
    // the stylesheet) — a grey button in a yellow box read as somebody else's.
    tone?: "warning" | "danger" | "info" | "success";
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const pad = opts.size === "sm" ? "px-3 py-2" : "p-5";
    // Clipping is for the footer's grey strip meeting the rounded corner; a
    // card without one clips nothing — a menu opening out of it needs the room.
    const TINT = { warning: "border-warning/40 bg-warning/10", danger: "border-error/40 bg-error/10", info: "border-info/40 bg-info/10", success: "border-success/40 bg-success/10" };
    return `<div class="card card-border ${opts.tone ? TINT[opts.tone] : "bg-base-100"} ${opts.footer ? "overflow-hidden" : ""} ${opts.class ?? ""}" ${ctx.fns.procs.ui.attr({ entity: opts.entity, id: opts.id, role: opts.role })}${opts.tone ? ` data-tone="${opts.tone}"` : ""}>
  ${opts.title ? `<div class="border-base-300 flex items-center justify-between gap-3 border-b px-5 py-3">
    <h3 class="card-title text-base">${esc(opts.title)}</h3>
    ${opts.actions ? `<div class="card-actions">${opts.actions}</div>` : ""}
  </div>` : ""}
  <div class="card-body ${pad}">${opts.body}</div>
  ${opts.footer ? `<div class="border-base-300 bg-base-200 text-base-content/60 border-t px-5 py-3 text-xs">${opts.footer}</div>` : ""}
</div>`;
}
