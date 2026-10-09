export default async function (ctx: Context, _session: Session | null, opts: { params: { name: string } }) {
    const name = opts.params.name.replace(/[^a-zA-Z0-9._-]/g, "");
    if (!name || name !== opts.params.name) return new Response("invalid filename", { status: 400 });
    const file = Bun.file(`${ctx.fns.procs.project.runtimeDir({})}/uploads/bot/${name}`);
    if (!(await file.exists())) return new Response("not found", { status: 404 });
    return new Response(file);
}
