// Channel adapter reports a send. Failure stays pending for a later adapter; this only marks sent.
export default function (ctx: Context, _session: Session | null, opts: { id: number; externalMessageId?: string }) {
    const now = new Date().toISOString();
    ctx.fns.procs.db.run({
        sql: "UPDATE bot_outbox_messages SET status = 'sent', sent_at = ?, external_message_id = ?, updated_at = ? WHERE id = ?",
        params: [now, opts.externalMessageId ?? null, now, opts.id],
    });
    return { ok: true };
}
