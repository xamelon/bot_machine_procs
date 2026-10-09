// A tiny line — a trend in the space of a word. Points are plotted edge to edge;
// the tone tints the stroke. No axes, no labels — the number lives elsewhere.
//
// The stroke is `currentColor` and the tone is a Tailwind class, not a theme
// variable in the attribute. `stroke="var(--color-state-info-fg)"` drew
// NOTHING: Tailwind v4 emits a `@theme` variable only when some generated
// utility uses it, and a name that appears solely inside an inline SVG
// attribute is tree-shaken away — so the stroke resolved to nothing and every
// sparkline on every page was an empty rectangle beside its number, with no
// error anywhere. A class is seen by the scan; `currentColor` cannot fail.
const TONE = {
    info: "text-info", success: "text-success", warning: "text-warning", danger: "text-error",
} as const;

export default function (_ctx: Context, _session: Session | null, opts: { values: number[]; tone?: keyof typeof TONE; class?: string }): string {
    const v = opts.values.filter(n => typeof n === "number");
    // One point is not a trend, and a blank svg standing in for it is worse
    // than nothing: it holds a slot the reader keeps looking at. Say nothing,
    // and let the caller put the number where the line would have been.
    if (v.length < 2) return "";
    const [min, max] = [Math.min(...v), Math.max(...v)];
    const span = max - min || 1;
    const step = 100 / (v.length - 1);
    const d = v.map((n, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(28 - ((n - min) / span) * 26).toFixed(1)}`).join(" ");
    // An explicit </path>: HTMLRewriter (screen.parse) throws "No end tag." on a
    // self-closing foreign element in some documents, so the page could render
    // but never be read back.
    return `<svg viewBox="0 0 100 30" preserveAspectRatio="none" class="${opts.class ?? "h-8 w-24"} ${TONE[opts.tone ?? "info"]}" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"></path></svg>`;
}
