// Admin shell. The rail comes from $app_ cards; #main is what htmx swaps.
export default function (ctx: Context, session: Session | null, opts: { title?: string; main: string; headExtra?: string }) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const path = session?.req ? new URL(session.req.url).pathname : "";
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title ?? "Bot")}</title>
<link rel="icon" href="/procs/ui/favicon.svg" type="image/svg+xml">
<script src="${ctx.fns.procs.ui.asset({ href: "/procs/ui/htmx.js" })}" defer></script>
<script src="${ctx.fns.procs.ui.asset({ href: "/procs/ui/menu.js" })}" defer></script>
<script src="${ctx.fns.procs.ui.asset({ href: "/procs/ui/toast.js" })}" defer></script>
${(ctx.state.procs?.styles ?? []).map((s: any) => `<link rel="stylesheet" href="${esc(s.href)}">`).join("\n")}
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
${opts.headExtra ?? ""}
</head>
<body class="flex min-h-screen bg-base-200 text-base-content text-sm">
${ctx.fns.bot.nav({ path })}
<main id="main" class="min-w-0 flex-1 p-6">${opts.main}</main>
</body>
</html>`;
}
