export default function (ctx: Context, _session: Session | null, opts: { params: { id: string } }) {
    ctx.fns.procs.db.run({ sql: "DELETE FROM bot_triggers WHERE id = ?", params: [opts.params.id] });
    return new Response(null, { status: 303, headers: { location: "/bot/triggers" } });
}
