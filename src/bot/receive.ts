// Continue a waiting node. null means this type has no receive handler — the runner re-enters it.
export default async function (ctx: Context, _session: Session | null, opts: { input: any; session: any; node: any }) {
    const node = opts.node;
    if (node?.type === "message") return message(ctx, opts.input, opts.session, node);
    if (node?.type === "input") return input(opts.input, opts.session, node);
    return null;
}

function message(ctx: Context, input: any, dialog: any, node: any) {
    const value = input?.payload || input?.text;
    const key = node.button_rows_key;
    const fromCtx = typeof key === "string" && key ? ctx.fns.bot.get({ source: dialog?.context, path: key }) : undefined;
    const buttonRows = Array.isArray(fromCtx) && fromCtx.length ? fromCtx
        : Array.isArray(node.button_rows) ? node.button_rows
        : Array.isArray(node.buttons) ? [node.buttons] : [];
    const matched = buttonRows.flat().find((b: any) => value === b?.payload || value === b?.label || value === b?.to);
    if (matched?.to) return { nextNodeId: matched.to };
    return { outputs: [], nextNodeId: null };
}

function input(input: any, dialog: any, node: any) {
    if (node.input_type === "photo") {
        const photo = firstPhoto(input);
        if (!photo) {
            return {
                outputs: [{
                    type: "message",
                    channel: input?.channel,
                    external_id: input?.external_id,
                    text: node.retry_prompt || "📷 Нужна именно фотография. Пришлите её следующим сообщением.",
                    buttons: [],
                    keyboard_mode: "inline",
                    buttons_per_row: 3,
                }],
            };
        }
        return { context: { ...(dialog?.context ?? {}), [node.input_key]: photo }, nextNodeId: node.next };
    }
    return { context: { ...(dialog?.context ?? {}), [node.input_key]: input?.payload || input?.text }, nextNodeId: node.next };
}

function firstPhoto(input: any) {
    for (const attachment of input?.attachments ?? []) {
        if (attachment?.type === "photo" && attachment.url) return attachment.url;
        if (attachment?.type === "photo" && attachment.ref) return attachment.ref;
        if (typeof attachment === "string" && attachment) return attachment;
    }
    return null;
}
