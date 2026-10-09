// Migrations are files, applied in id order and recorded, so running them twice
// changes nothing. The id is the file name — nothing to keep in sync by hand.
export default {
    up(ctx: Context) {
        ctx.fns.procs.db.exec({ sql: "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, at TEXT NOT NULL)" });
    },
    down(ctx: Context) {
        ctx.fns.procs.db.exec({ sql: "DROP TABLE IF EXISTS notes" });
    },
};
