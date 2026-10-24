// The GitHub sign-in in progress, or null — an expired one is dropped here, so
// a token never outlives its fifteen minutes even if nobody comes back.
export default function (ctx: Context, _session: Session | null, _opts: {}) {
    const flow = ctx.state.repo?.github;
    if (!flow) return null;
    if (flow.expiresAt <= Date.now()) { delete ctx.state.repo!.github; return null; }
    return flow;
}
