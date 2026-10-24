// Lazily open the sqlite connection and cache it in this module's own state —
// ctx.state.procs.db.connection, like every module's state. Because state
// is per-ctx, a forked test env (env.fork) gets its OWN isolated connection —
// dev's file db and a test's :memory: db never touch.
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export default function (ctx: Context, _session: Session | null, _opts?: {}): Database {
    const st = ((ctx.state.procs ??= {} as any).db ??= {});
    if (st.connection) return st.connection;
    const url = ctx.fns.procs.db.url();
    if (url !== ":memory:" && url.includes("/")) mkdirSync(dirname(url), { recursive: true });
    st.connection = new Database(url);
    // Another process may hold the write lock for a moment (the supervisor
    // writes operator sessions into the same file): wait for it rather than
    // failing the bot's own write with SQLITE_BUSY.
    st.connection.exec("PRAGMA busy_timeout = 5000");
    return st.connection;
}
