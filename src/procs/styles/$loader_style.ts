// `<module>/$style_<name>.css` — a plain stylesheet, bundled by Bun
// (styles.build), kept in memory and served at the path its name spells. The
// framework's own stylesheet leads and a module's cascades over it, so the order
// is the layout's.
export default async function (ctx: Context, _session: Session | null, opts: { entries: any[] }): Promise<void> {
    const routes = (ctx.state.procs.http.routes ??= {});
    const styles = (ctx.state.procs.styles ??= []);
    for (const entry of opts.entries) {
        const style = { href: entry.routePath, abs: entry.abs, key: entry.abs.replace(/[^a-zA-Z0-9]+/g, "_") };
        (routes[style.href] ??= {}).GET = async (rctx: Context) => {
            const css = await rctx.fns.procs.styles.current({ key: style.key });
            // `no-cache`, not `no-store`: the browser keeps the sheet and
            // revalidates it (http.respond gives it an ETag and answers 304), so a
            // navigation costs one conditional request, and a rebuilt sheet is
            // picked up the moment its bytes change.
            return new Response(css, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-cache" } });
        };
        styles.push(style);
        ctx.fns.procs.log.debug({ event: "load.style", msg: style.href, from: `${entry.root}/${entry.rel}` });
    }
    const framework = (s: any) => Number(s.href.startsWith("/procs/styles/"));
    styles.sort((a: any, b: any) => framework(b) - framework(a));
}
