export default function (ctx: Context, _session: Session | null, opts: {
    items: string[]; label?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const src = ctx.fns.procs.ui.asset({ href: "/procs/ui/media.js" });
    return `<div class="asx-carousel ${esc(opts.class ?? "")}" data-asx-carousel aria-label="${esc(opts.label ?? "Carousel")}"><div class="asx-carousel__track" data-asx-carousel-track>${opts.items.map(i => `<div class="asx-carousel__slide">${i}</div>`).join("")}</div><button class="asx-carousel__prev" data-asx-carousel-prev type="button" aria-label="Previous">‹</button><button class="asx-carousel__next" data-asx-carousel-next type="button" aria-label="Next">›</button><script src="${esc(src)}" defer></script></div>`;
}
