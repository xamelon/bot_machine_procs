// Which messenger a row came from, as a pill: brand logo + TG / VK / MAX.
// In a table: `render: (row) => ctx.fns.procs.ui.platform({ platform: row.channel })`.
// `platform` is the `channel` column as stored ("telegram", "vk", "max"); "tg"
// is accepted too. Anything else (the "echo" sandbox, a future adapter) gets a
// neutral icon and its own name, never an empty pill.
//
// The logos are CSS masks in `$style_core.css` (`.asx-platform__logo`), so the
// markup stays one span and MAX keeps its brand gradient. Sources:
// Telegram and VK — Simple Icons (CC0); MAX — Wikimedia Commons "Max (app) logo.svg".
const KNOWN: Record<string, { label: string; title: string }> = {
    telegram: { label: "TG", title: "Telegram" },
    vk: { label: "VK", title: "VK" },
    max: { label: "MAX", title: "MAX" },
};
const ALIAS: Record<string, string> = { tg: "telegram" };

export default function (ctx: Context, _session: Session | null, opts: {
    platform: string | null | undefined; label?: string; size?: "sm" | "md"; class?: string;
}): string {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const raw = String(opts.platform ?? "").trim().toLowerCase();
    const id = ALIAS[raw] ?? raw;
    const known = KNOWN[id];
    const label = opts.label ?? known?.label ?? (raw || "—");
    const icon = known
        ? `<span class="asx-platform__logo" aria-hidden="true"></span>`
        : `<i class="ph ${id === "echo" ? "ph-flask" : "ph-chat-circle"}" aria-hidden="true"></i>`;
    return `<span class="asx-platform ${esc(opts.class ?? "")}" data-platform="${esc(known ? id : "other")}" data-size="${esc(opts.size ?? "md")}" title="${esc(known?.title ?? raw)}">${icon}<span class="asx-platform__label">${esc(label)}</span></span>`;
}
