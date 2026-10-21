export default function (ctx: Context, _session: Session | null, opts: {
    value: string | number | Date; format?: "date" | "time" | "datetime" | "relative"; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const date = new Date(opts.value);
    const iso = date.toISOString();
    const text = opts.format === "time" ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : opts.format === "date" ? date.toLocaleDateString()
        : opts.format === "relative" ? relative(date)
        : date.toLocaleString();
    return `<time class="asx-timestamp ${esc(opts.class ?? "")}" datetime="${esc(iso)}">${esc(text)}</time>`;
}

function relative(date: Date): string {
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const abs = Math.abs(seconds);
    const unit = abs < 60 ? "second" : abs < 3600 ? "minute" : abs < 86400 ? "hour" : "day";
    const value = unit === "second" ? seconds : unit === "minute" ? Math.round(seconds / 60) : unit === "hour" ? Math.round(seconds / 3600) : Math.round(seconds / 86400);
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(value, unit as any);
}
