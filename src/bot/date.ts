// A stored moment in the admin: `bot.formatDate` text inside `<time>`, with the
// exact moment (full date, seconds, zone) on hover and the ISO value in
// `datetime`. In a table: `render: (row) => ctx.fns.bot.date({ value: row.paid_at })`.
import type { DateFormat } from "./formatDate";

export default function (ctx: Context, _session: Session | null, opts: {
    value: string | number | Date | null | undefined; format?: Exclude<DateFormat, "iso">;
    timeZone?: string; locale?: string; empty?: string; now?: number; class?: string;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const text = ctx.fns.bot.formatDate(opts);
    const iso = ctx.fns.bot.formatDate({ ...opts, format: "iso", empty: "" });
    if (!iso) return `<span class="asx-date ${esc(opts.class ?? "")}" data-empty>${esc(text)}</span>`;
    const full = ctx.fns.bot.formatDate({ ...opts, format: "full" });
    const timeZone = opts.timeZone || (ctx.fns.procs.config.resolve({ module: "bot" }) as { timeZone: string }).timeZone;
    return `<time class="asx-date ${esc(opts.class ?? "")}" datetime="${esc(iso)}" title="${esc(`${full} (${timeZone})`)}">${esc(text)}</time>`;
}
