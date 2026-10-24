// A stored moment as words for a person: "24 окт., 06:09".
//
// The database keeps UTC ISO strings and the server (Docker) runs in UTC, so
// `toLocaleString()` would print the server's clock. The zone and locale come
// from the `bot` config (`BOT_TIMEZONE`, `BOT_LOCALE`) — the audience's, not the
// host's. Plain text, so a bot message can use it too; `bot.date` wraps it in
// `<time>` for the admin.
//
// format:
//   "datetime" (default)  24 окт., 06:09        — the year only when it isn't this one
//   "date"                24 окт.               — likewise
//   "time"                06:09
//   "full"                24 октября 2026 г., 06:09:45
//   "relative"            5 минут назад, вчера, через 2 дня
//   "iso"                 2026-10-24T03:09:07.000Z — for `datetime` attributes
// Empty or unparseable values give `empty` (default "—").
export type DateFormat = "datetime" | "date" | "time" | "full" | "relative" | "iso";

export default function (ctx: Context, _session: Session | null, opts: {
    value: string | number | Date | null | undefined; format?: DateFormat;
    timeZone?: string; locale?: string; empty?: string; now?: number;
}): string {
    const date = parse(opts.value);
    if (!date) return opts.empty ?? "—";
    if (opts.format === "iso") return date.toISOString();
    const config = ctx.fns.procs.config.resolve({ module: "bot" }) as { timeZone: string; locale: string };
    const timeZone = opts.timeZone || config.timeZone || "UTC";
    const locale = opts.locale || config.locale || "ru-RU";
    const now = opts.now ?? Date.now();
    const format = opts.format ?? "datetime";
    if (format === "relative") return relative(date.getTime(), now, locale, timeZone);
    if (format === "time") return new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit" }).format(date);
    if (format === "full") return new Intl.DateTimeFormat(locale, { timeZone, day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
    const year = (d: Date | number) => new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(d);
    const withYear = year(date) !== year(now);
    return new Intl.DateTimeFormat(locale, {
        timeZone, day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}),
        ...(format === "date" ? {} : { hour: "2-digit", minute: "2-digit" }),
    } as Intl.DateTimeFormatOptions).format(date);
}

// ISO strings, epoch milliseconds, Dates. SQLite's "YYYY-MM-DD HH:MM:SS" has no
// zone and is UTC by SQLite's own definition, so it is read as UTC rather than
// as the server's local time.
function parse(value: unknown): Date | null {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value.trim())) value = `${value.trim().replace(" ", "T")}Z`;
    const date = value instanceof Date ? value : new Date(value as string | number);
    return Number.isNaN(date.getTime()) ? null : date;
}

// Up to an hour in minutes, up to a day in hours, beyond that in calendar days
// of the audience's zone: something at 23:50 yesterday is "вчера", not "10 минут назад"
// only because fewer than 24 hours have passed.
function relative(then: number, now: number, locale: string, timeZone: string): string {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const seconds = Math.round((then - now) / 1000);
    const abs = Math.abs(seconds);
    if (abs < 60) return rtf.format(0, "second");
    if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
    const day = (t: number) => {
        const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(t).split("-").map(Number);
        return Date.UTC(y!, m! - 1, d!) / 86_400_000;
    };
    const days = day(then) - day(now);
    if (days === 0) return rtf.format(Math.round(seconds / 3600), "hour");
    if (Math.abs(days) < 30) return rtf.format(days, "day");
    if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), "month");
    return rtf.format(Math.round(days / 365), "year");
}
