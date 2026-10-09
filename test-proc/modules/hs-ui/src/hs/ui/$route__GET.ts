// …and its urls follow the same path: GET /hs/ui.
export default function (ctx: Context, _session: Session | null, _opts: {}): string {
    return ctx.fns.hs.ui.button({ label: "ok" });
}
