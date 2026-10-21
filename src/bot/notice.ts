export default function (ctx: Context, _session: Session | null, opts: {
    tone?: "success" | "warning" | "danger" | "info"; text: string;
}) {
    const tone = opts.tone === "danger" ? "error" : opts.tone ?? "info";
    return ctx.fns.procs.ui.banner({ tone, body: opts.text });
}
