export default function (ctx: Context, _session: Session | null, opts: {
    src: string; alt?: string; thumb?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const srcScript = ctx.fns.procs.ui.asset({ href: "/procs/ui/media.js" });
    return `<button class="asx-lightbox ${esc(opts.class ?? "")}" data-asx-lightbox data-src="${esc(opts.src)}" data-alt="${esc(opts.alt ?? "")}" type="button"><img src="${esc(opts.thumb ?? opts.src)}" alt="${esc(opts.alt ?? "")}"></button><script src="${esc(srcScript)}" defer></script>`;
}
