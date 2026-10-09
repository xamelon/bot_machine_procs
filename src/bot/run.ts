// Pure runner. No DB. A trigger jumps or restarts; a bare reply continues the waiting node.
const MAX_STEPS = 50;

export default async function (ctx: Context, _session: Session | null, opts: {
    flow: any;
    input: any;
    session?: any;
    trigger?: any;
    actions?: Record<string, Action>;
}) {
    const flow = opts.flow;
    const input = opts.input ?? {};
    const trigger = opts.trigger ?? null;
    const actions = opts.actions ?? actionsFrom(ctx);
    const prior = opts.session ?? null;
    const preserve = trigger?.session_mode === "notify_only" && prior
        ? { currentNodeId: prior.currentNodeId, completed: prior.completed, flowId: prior.flowId, flowVersion: prior.flowVersion }
        : null;
    let dialog = prepare(flow, input, prior, trigger);
    const events: any[] = [event("input_received", flow, dialog)];
    const startId = trigger?.start_node_id || dialog.currentNodeId;
    const start = node(flow, startId);
    const receiving = !!prior && !trigger;

    let result;
    if (receiving) {
        const received = await ctx.fns.bot.receive({ input, session: dialog, node: start });
        if (received) {
            dialog = apply(dialog, received, start);
            result = received.nextNodeId
                ? await walk(ctx, flow, input, actions, dialog, node(flow, received.nextNodeId), [...(received.outputs ?? [])], events, 0)
                : { session: { ...dialog, currentNodeId: start.id }, outputs: received.outputs ?? [], events };
        }
    }
    result ??= await walk(ctx, flow, input, actions, dialog, start, [], events, 0);
    if (preserve) result.session = { ...result.session, ...preserve };
    return result;
}

async function walk(ctx: Context, flow: any, input: any, actions: Record<string, Action>, dialog: any, current: any, outputs: any[], events: any[], steps: number): Promise<any> {
    if (steps >= MAX_STEPS) throw new Error("bot flow exceeded max steps");
    events.push(event("node_entered", flow, dialog, current));
    const entered = await ctx.fns.bot.enter({ input, session: dialog, node: current, actions });
    dialog = apply(dialog, entered, current);
    outputs = outputs.concat(entered.outputs ?? []);
    events.push(event("node_completed", flow, dialog, current));
    if (entered.completed) {
        events.push(event("flow_completed", flow, dialog, current));
        return { session: { ...dialog, completed: true }, outputs, events };
    }
    if (entered.nextNodeId) return walk(ctx, flow, input, actions, dialog, node(flow, entered.nextNodeId), outputs, events, steps + 1);
    return { session: { ...dialog, currentNodeId: current.id }, outputs, events };
}

function prepare(flow: any, input: any, prior: any, trigger: any) {
    if (!prior || trigger?.session_mode === "restart") {
        return {
            channel: input.channel,
            externalId: input.external_id,
            flowId: flow.id,
            flowVersion: flow.version,
            currentNodeId: trigger?.start_node_id || flow.start_node_id,
            context: {},
            completed: false,
        };
    }
    const jumped = trigger?.start_node_id && trigger.session_mode !== "notify_only";
    return { ...prior, flowId: flow.id, flowVersion: flow.version, currentNodeId: jumped ? trigger.start_node_id : prior.currentNodeId };
}

function apply(dialog: any, result: any, current: any) {
    return { ...dialog, context: result.context ?? dialog.context, currentNodeId: result.nextNodeId || current.id };
}

function node(flow: any, id: string) {
    const found = (flow.nodes ?? []).find((n: any) => n?.id === id);
    if (!found) throw new Error(`missing bot flow node: ${id}`);
    return found;
}

function event(type: string, flow: any, dialog: any, current?: any) {
    return { event_type: type, flow_id: flow.id, node_id: current?.id ?? null, session_id: dialog.id ?? null };
}

type Action = (ctx: Context, session: Session | null, opts: any) => any;

function actionsFrom(ctx: Context) {
    const handlers = ctx.state.procs?.hooks?.handlers ?? {};
    const out: Record<string, Action> = {};
    for (const [name, map] of Object.entries(handlers)) {
        if (!name.startsWith("bot.action.")) continue;
        const fn = [...map.values()][0] as Action | undefined;
        if (fn) out[name.slice("bot.action.".length)] = fn;
    }
    return out;
}
