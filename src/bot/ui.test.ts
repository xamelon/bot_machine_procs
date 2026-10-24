import { test, expect } from "bun:test";
import { testCtx } from "../$test";

const now = Date.parse("2026-10-24T12:00:00Z");

test("formatDate speaks the audience's zone and language, not the server's", async () => {
    const ctx = await testCtx();
    const f = (value: any, format?: any) => ctx.fns.bot.formatDate({ value, format, now, timeZone: "Europe/Moscow", locale: "ru-RU" });
    expect(f("2026-10-24T03:09:07.000Z")).toBe("24 окт., 06:09");
    // New Year in Moscow is still last year in UTC: the zone decides the year too.
    expect(f("2025-12-31T22:30:00Z")).toBe("1 янв., 01:30");
    expect(f("2025-12-31T20:30:00Z")).toBe("31 дек. 2025 г., 23:30");
    expect(f("2025-05-01T10:00:00Z", "date")).toBe("1 мая 2025 г.");
    expect(f("2026-10-24T03:09:07Z", "time")).toBe("06:09");
    expect(f("2026-10-24T03:09:07Z", "full")).toBe("24 октября 2026 г. в 06:09:07");
    // SQLite's zone-less timestamp is UTC.
    expect(f("2026-10-24 03:09:07", "time")).toBe("06:09");
    expect(f("2026-10-24 03:09:07", "iso")).toBe("2026-10-24T03:09:07.000Z");
    expect(f(now - 5 * 60_000, "relative")).toBe("5 минут назад");
    expect(f(Date.parse("2026-10-23T20:50:00Z"), "relative")).toBe("вчера");
    expect(f(now + 2 * 86_400_000, "relative")).toBe("послезавтра");
    expect(f(null)).toBe("—");
    expect(f("not a date")).toBe("—");
    expect(ctx.fns.bot.formatDate({ value: "", empty: "нет" })).toBe("нет");
    // Defaults come from the bot config.
    expect(ctx.fns.bot.formatDate({ value: "2026-10-24T03:09:07Z", format: "time" })).toBe("06:09");
});

test("date renders <time> with the exact moment on hover", async () => {
    const ctx = await testCtx();
    const html = ctx.fns.bot.date({ value: "2026-10-24T03:09:07Z", now, timeZone: "Europe/Moscow" });
    expect(html).toContain(`datetime="2026-10-24T03:09:07.000Z"`);
    expect(html).toContain(`title="24 октября 2026 г. в 06:09:07 (Europe/Moscow)"`);
    expect(html).toContain(">24 окт., 06:09</time>");
    expect(ctx.fns.bot.date({ value: null })).toBe(`<span class="asx-date " data-empty>—</span>`);
});
