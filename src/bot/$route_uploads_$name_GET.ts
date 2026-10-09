export default function (ctx: Context, _session: Session | null, opts: { params: { name: string } }) {
    const name = opts.params.name.replace(/[^\w.]+/g, "");
    const file = Bun.file(`${ctx.fns.procs.project.runtimeDir({})}/uploads/${name}`);
    if (!file.size) return new Response("not found", { status: 404 });
    return new Response(file);
}
