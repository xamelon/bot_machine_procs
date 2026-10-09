export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const file = (await opts.req.formData()).get("image");
    if (!(file instanceof File)) return Response.json({ ok: false, error: "image is required" }, { status: 422 });
    try {
        const saved = await ctx.fns.bot.saveMedia({ file });
        return Response.json({ ok: true, attachment: { type: "photo", url: saved.url } });
    } catch (error: any) {
        return Response.json({ ok: false, error: String(error?.message ?? error) }, { status: 422 });
    }
}
