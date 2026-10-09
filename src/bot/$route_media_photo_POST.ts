export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const file = (await opts.req.formData()).get("image");
    if (!(file instanceof File)) return Response.json({ ok: false, error: "image is required" }, { status: 422 });
    const dir = `${ctx.fns.procs.project.runtimeDir({})}/uploads`;
    const name = `${Date.now()}-${file.name.replace(/[^\w.]+/g, "_")}`;
    await Bun.write(`${dir}/${name}`, file);
    return Response.json({ ok: true, attachment: { type: "photo", url: `/bot/uploads/${name}` } });
}
