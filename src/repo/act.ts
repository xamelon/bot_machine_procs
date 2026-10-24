// One Repository-page action: admins only, then `run`, then back to /repo with
// what happened as the notice. The supervisor already keeps viewers off every
// POST; this keeps editors off these.
export default async function (ctx: Context, _session: Session | null, opts: { run: () => Promise<string> }) {
    const back = (notice: string, tone: "success" | "error", status = 303) =>
        new Response(null, { status, headers: { location: `/repo?notice=${encodeURIComponent(notice)}&tone=${tone}` } });
    if (!ctx.fns.team.can({ permission: "repo.manage" })) return new Response("Admins only", { status: 403 });
    try { return back(await opts.run(), "success"); }
    catch (error: any) { return back(String(error?.message ?? error), "error"); }
}
