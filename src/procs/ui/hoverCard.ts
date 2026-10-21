export default function (ctx: Context, _session: Session | null, opts: {
    trigger: string; title?: string; body: string; media?: string; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    return `<span class="asx-hover-card ${esc(opts.class ?? "")}">
        ${opts.trigger}
        <span class="asx-hover-card__panel" role="tooltip">
            ${opts.media ? `<span class="asx-hover-card__media">${opts.media}</span>` : ""}
            ${opts.title ? `<span class="asx-hover-card__title">${esc(opts.title)}</span>` : ""}
            <span class="asx-hover-card__body">${opts.body}</span>
        </span>
    </span>`;
}
