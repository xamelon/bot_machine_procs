// {{ path }} against context. Missing → empty string.
export default function (ctx: Context, _session: Session | null, opts: { template: string; context?: any }) {
    return String(opts.template ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
        const value = ctx.fns.bot.get({ source: opts.context ?? {}, path });
        return value == null ? "" : String(value);
    });
}
