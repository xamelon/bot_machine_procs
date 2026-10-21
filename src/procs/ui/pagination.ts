export default function (ctx: Context, _session: Session | null, opts: {
    page: number; total: number; href?: string; target?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const page = Math.max(1, opts.page);
    const total = Math.max(1, opts.total);
    const url = (p: number) => opts.href ? `${opts.href}${opts.href.includes("?") ? "&" : "?"}page=${p}` : "#";
    const item = (p: number, label = String(p), disabled = false) => `<a class="asx-pagination__item" data-current="${p === page ? "true" : "false"}" aria-current="${p === page ? "page" : "false"}" ${disabled ? `aria-disabled="true"` : `href="${esc(url(p))}"${opts.href ? ` hx-get="${esc(url(p))}" hx-target="${esc(opts.target ?? "#main")}" hx-swap="innerHTML" hx-push-url="true"` : ""}`}> ${esc(label)} </a>`;
    const nums = Array.from(new Set([1, page - 1, page, page + 1, total].filter(p => p >= 1 && p <= total))).sort((a,b) => a-b);
    let last = 0;
    const body = nums.map(p => { const gap = p - last > 1 ? `<span class="asx-pagination__ellipsis">…</span>` : ""; last = p; return gap + item(p); }).join("");
    return `<nav class="asx-pagination ${esc(opts.class ?? "")}" aria-label="Pagination">${item(page - 1, "‹", page <= 1)}${body}${item(page + 1, "›", page >= total)}</nav>`;
}
