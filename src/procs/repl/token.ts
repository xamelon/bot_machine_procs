// Single-purpose REPL JWT, renewed five minutes before expiry. The file is
// replaced atomically with mode 0600; clients reread it for every request.
import { open, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export default async function (ctx: Context, _session: Session | null, _opts?: {}): Promise<string> {
    const state = (ctx.state.procs.repl ??= {});
    const claims = state.token ? await ctx.fns.procs.auth.verify({ token: state.token }) : null;
    if (claims?.kind === "repl" && claims.exp > Date.now() / 1000 + 300) {
        schedule(ctx, state, claims.exp);
        return state.token!;
    }
    if (state.renewing) return state.renewing;
    state.renewing = (async () => {
        const token = await ctx.fns.procs.auth.sign({ sub: "repl", name: "repl", kind: "repl", days: 1 });
        const file = `${ctx.fns.procs.project.runtimeDir({})}/repl-token`;
        const temp = `${file}.${randomUUID()}.tmp`;
        try {
            const handle = await open(temp, "wx", 0o600);
            try { await handle.writeFile(token); } finally { await handle.close(); }
            await rename(temp, file);
        } finally { await unlink(temp).catch(() => {}); }
        state.token = token;
        const issued = await ctx.fns.procs.auth.verify({ token });
        schedule(ctx, state, issued!.exp);
        return token;
    })();
    try { return await state.renewing; }
    finally { state.renewing = undefined; }
}

function schedule(ctx: Context, state: any, exp: number) {
    if (state.renewalTimer) clearTimeout(state.renewalTimer);
    state.renewalTimer = setTimeout(() => {
        state.renewalTimer = undefined;
        ctx.fns.procs.repl.token({}).catch((error: any) => {
            ctx.fns.procs.log.error({ event: "repl.token.renewal_failed", msg: String(error?.message ?? error) });
            schedule(ctx, state, Date.now() / 1000 + 360);
        });
    }, Math.max(1000, (exp - 300) * 1000 - Date.now()));
    state.renewalTimer.unref();
}
