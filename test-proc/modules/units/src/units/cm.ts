// A module that says what it is in its own package.json — no second manifest.
export default function (_ctx: Context, _session: Session | null, opts: { inch: number }): number {
    return Math.round(opts.inch * 2.54 * 10) / 10;
}
