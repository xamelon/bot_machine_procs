// The data-* markers that make a page readable and drivable. Emit them here so
// every module shares one closed vocabulary and a typo cannot silently become
// an attribute no screen verb understands.
//
//   page     one semantic root per screen
//   section  a named region a tour can explain
//   entity   a row/card/thing; id identifies it
//   status   the entity/control state
//   role     a meaningful part of an entity
//   form     a form addressable by fill/submit
//   action   a control's stable verb
//   field    a control or wrapper's stable field name
const KEYS = ["page", "section", "entity", "id", "status", "role", "form", "action", "field"] as const;

export default function (ctx: Context, _session: Session | null, opts: types.procs.ui.SemanticAttr): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const out: string[] = [];
    for (const key of Object.keys(opts) as Array<keyof types.procs.ui.SemanticAttr>) {
        if (!(KEYS as readonly string[]).includes(key)) continue;
        const value = opts[key];
        if (value === null || value === undefined || value === "") continue;
        out.push(`data-${key}="${esc(String(value))}"`);
    }
    return out.join(" ");
}
