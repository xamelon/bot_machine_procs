// Format changed assistant messages in one batch using the shared Bun renderer.
export default async function (ctx: Context, _session: Session | null, opts: { req: Request }) {
    const raw = await opts.req.text();
    if (raw.length > 1_000_000) return new Response("Markdown batch too large", { status: 413 });
    let body: any;
    try { body = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }
    if (!Array.isArray(body?.texts) || body.texts.length > 128 || body.texts.some((text: any) => typeof text !== "string")) {
        return new Response("Expected up to 128 Markdown strings", { status: 400 });
    }
    return Response.json({ html: body.texts.map((markdown: string) => ctx.fns.procs.ui.markdown({ markdown, images: false })) }, { headers: { "cache-control": "no-store" } });
}
