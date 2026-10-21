// Compatibility alias for callers that predate screen.read({ mode: "browser" }).
// New code should use screen.read so server and live vision share one API.
export default async function (ctx: Context, _session: Session | null, opts: { scope?: "main" | "chat" | "body"; text?: boolean; maxText?: number } = {}) {
    return await ctx.fns.screen.read({ mode: "browser", ...opts });
}
