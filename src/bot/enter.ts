// Enter a node. Standard types only; an app action is a bot.action.* hook.
export default async function (ctx: Context, _session: Session | null, opts: {
    input: any;
    session: any;
    node: any;
    actions?: Record<string, (ctx: Context, session: Session | null, opts: any) => any>;
}) {
    const node = opts.node;
    const input = opts.input ?? {};
    const dialog = opts.session ?? { context: {} };
    switch (node?.type) {
        case "message": return message(ctx, input, dialog, node);
        case "input": return inputEnter(ctx, input, dialog, node);
        case "action": return action(ctx, input, dialog, node, opts.actions ?? {});
        case "condition": return condition(ctx, dialog, node);
        case "end": return { completed: true };
        default: throw new Error(`unknown node type: ${node?.type}`);
    }
}

function message(ctx: Context, input: any, dialog: any, node: any) {
    const buttonRows = rows(ctx, node, dialog.context);
    const buttons = buttonRows.flat().map((b: any) => ({ label: b?.label, payload: b?.payload || b?.label, to: b?.to }));
    return {
        outputs: [out(input, ctx.fns.bot.render({ template: node.text ?? "", context: dialog.context }), {
            buttons, button_rows: buttonRows, attachments: photos(ctx, node, dialog.context),
            keyboard_mode: node.keyboard_mode === "reply" ? "reply" : "inline",
            buttons_per_row: node.buttons_per_row ?? 3,
        })],
        nextNodeId: node.next,
    };
}

function inputEnter(ctx: Context, input: any, dialog: any, node: any) {
    if (!node.prompt) return { outputs: [] };
    return { outputs: [out(input, ctx.fns.bot.render({ template: node.prompt, context: dialog.context }))] };
}

async function action(ctx: Context, input: any, dialog: any, node: any, actions: Record<string, Function>) {
    const fn = actions[node.action];
    if (!fn) throw new Error(`unknown bot action: ${node.action}`);
    const result = await fn(ctx, null, { session: dialog, input, params: node.params ?? {} }) ?? {};
    if (result.nextNodeId === undefined) result.nextNodeId = node.next;
    return result;
}

function condition(ctx: Context, dialog: any, node: any) {
    const branch = (node.branches ?? []).find((b: any) => branchMatches(ctx, b, dialog.context));
    return { nextNodeId: branch?.to ?? node.default };
}

function branchMatches(ctx: Context, branch: any, context: any) {
    const when = branch?.when;
    const value = ctx.fns.bot.get({ source: context, path: when?.path });
    if (when?.op === "exists") return value != null && value !== "";
    if (when?.op === "equals") return value === when.value;
    return false;
}

function rows(ctx: Context, node: any, context: any): any[] {
    if (typeof node.button_rows_key === "string" && node.button_rows_key) {
        const fromCtx = ctx.fns.bot.get({ source: context, path: node.button_rows_key });
        if (Array.isArray(fromCtx) && fromCtx.length) return fromCtx;
    }
    if (Array.isArray(node.button_rows)) return node.button_rows;
    if (Array.isArray(node.buttons)) return [node.buttons];
    return [];
}

function photos(ctx: Context, node: any, context: any) {
    return (node.attachments ?? []).filter((a: any) => a?.type === "photo").map((a: any) => {
        const photo: any = { type: "photo" };
        const ref = optional(ctx, a.ref, context);
        const url = optional(ctx, a.url, context);
        if (ref) photo.ref = ref;
        if (url) photo.url = url;
        return photo;
    });
}

function optional(ctx: Context, value: unknown, context: any) {
    if (value == null || value === "") return undefined;
    return ctx.fns.bot.render({ template: String(value), context });
}

function out(input: any, text: string, extra: Record<string, any> = {}) {
    return {
        type: "message",
        channel: input.channel,
        external_id: input.external_id,
        text,
        buttons: [],
        keyboard_mode: "inline",
        buttons_per_row: 3,
        ...extra,
    };
}
