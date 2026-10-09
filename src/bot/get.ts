// Dot-path into a context map. Missing anywhere → undefined.
export default function (_ctx: Context, _session: Session | null, opts: { source: any; path: string }) {
    let cur = opts.source;
    if (!opts.path) return undefined;
    for (const key of opts.path.split(".")) {
        if (cur == null || typeof cur !== "object") return undefined;
        cur = cur[key];
    }
    return cur;
}
