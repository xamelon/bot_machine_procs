export default function (ctx: Context, session: Session | null, opts: {
    body: string; gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6; align?: "start" | "center" | "end" | "stretch"; justify?: "start" | "center" | "end" | "between"; class?: string;
}) {
    return ctx.fns.procs.ui.stack({ ...opts, direction: "vertical" });
}
