import { resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { BACKGROUND_CONTEXT as context } from "@earendil-works/chord/context";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";
import { Harness, createRegistry } from "@earendil-works/pi-durable";
import { openNodeJsonlStorage } from "@earendil-works/pi-durable/storage/jsonl/node";
import appTools from "./tools";
import credentials from "./credentials";
import auth from "./auth";

const root = resolve(process.env.APP_ROOT!);
await mkdir(resolve(root, ".runtime/agent"), { recursive: true });
const models = builtinModels({ credentials: await credentials(resolve(root, ".runtime/agent/auth/credentials.json")) });
const deviceIdPath = resolve(root, ".runtime/agent/auth/device-id");
let deviceId: string;
try { deviceId = (await readFile(deviceIdPath, "utf8")).trim(); }
catch (e: any) {
    if (e.code !== "ENOENT") throw e;
    deviceId = crypto.randomUUID();
    await writeFile(deviceIdPath, deviceId, { mode: 0o600, flag: "wx" });
}
const providerAuth = auth(models, { getDeviceId: () => deviceId, agentName: "Procs bot" });
const defaultModel = { provider: "openai", modelId: process.env.PI_MODEL || "gpt-4.1" };
const registry = createRegistry();
registry.install(await appTools(root));
// ponytail: JSONL keeps history in memory. Use a Bun SQLite adapter for long-running production sessions.
const harness = await Harness.open(await openNodeJsonlStorage(resolve(root, ".runtime/agent/session"), context, { fsync: true }), { models, registry }, context);
const INSTRUCTIONS = "You maintain this procs application. Use list/read/edit/write to change app src only: paths name files from the project root (src/app/x.ts), and a bare app/x.ts is read from src. A bot flow is not a file: its nodes and texts live in bot_flow_versions.definition, so change it through the admin editor at /bot/flows, or in repl read that row and call await ctx.fns.bot.save({ definition }); write a $migration_* file only when the change must ship with the code to every installation, never for a one-off edit. The shared framework and base admin are supplied by bot_machine, independently of the application. Tools expose them under virtual core/ paths (start with core/src/procs/PROCS.md): you may read them to understand a function, a page or a contract, but you cannot write it — shared changes belong in the core repository. Do not copy shared core into app src. Consuming apps keep their specific code in src/app. The <tools> section of this prompt lists every tool you can call right now — repl among them, for inspecting the running app and its data. Functions call neighbours through ctx.fns, never import them. One default function per file, state on ctx.state. Ordinary edits hot reload; main/start/stop edits need a runtime restart. Explain changes and limitations honestly.";
const conversation = await harness.root(context, { agent: {
    model: defaultModel,
    instructions: INSTRUCTIONS,
} });
const view = await conversation.viewState(context);
// `root()` returns an existing conversation without applying these options, so a
// new instruction belongs to the next boot only if we put it there ourselves.
// The model stays whatever the UI last chose: only instructions are reconciled.
if ((view.value.docs["pi.agent"] as any)?.instructions !== INSTRUCTIONS) await conversation.configure({ instructions: INSTRUCTIONS }, context);
const selected = () => (view.value.docs["pi.agent"] as any)?.model ?? defaultModel;
harness.resume();

Bun.serve({ hostname: "127.0.0.1", port: Number(process.env.PORT), async fetch(req) {
    if (req.headers.get("authorization") !== `Bearer ${process.env.CONTROL_TOKEN}`) return new Response("Forbidden", { status: 403 });
    const path = new URL(req.url).pathname;
    try {
        const authResponse = await providerAuth.handle(req);
        if (authResponse) return authResponse;
        if (req.method === "GET" && path === "/state") return Response.json({ ...view.value, configured: Boolean(await models.checkAuth(selected().provider)), provider: selected().provider, model: selected().modelId, tools: registry.snapshot().installed().flatMap((extension: any) => (extension.tools ?? []).map((tool: any) => tool.name)), sections: registry.snapshot().installed().flatMap((extension: any) => (extension.sections ?? []).map((section: any) => section.key)) });
        if (req.method === "POST" && path === "/model") {
            const body = await req.json();
            if (typeof body.provider !== "string" || typeof body.modelId !== "string" || !models.getModel(body.provider, body.modelId)) return Response.json({ error: "Unknown model" }, { status: 400 });
            if (Object.keys(view.value.docs["pi.live"] ?? {}).length) return Response.json({ error: "Stop the agent before changing models" }, { status: 409 });
            if (!await models.checkAuth(body.provider)) return Response.json({ error: "Connect this provider first" }, { status: 400 });
            await conversation.configure({ model: { provider: body.provider, modelId: body.modelId } }, context);
            return Response.json({ ok: true });
        }
        if (req.method === "POST" && path === "/submit") {
            if (!await models.checkAuth(selected().provider)) return Response.json({ error: "Connect an LLM provider and select a model in Providers" }, { status: 503 });
            const body = await req.json();
            if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 32_000 || typeof body.requestId !== "string") return new Response("Invalid input", { status: 400 });
            const submission = await conversation.submit({ type: "input", content: body.text, requestId: body.requestId }, context);
            return Response.json({ id: submission.id }, { status: 202 });
        }
        if (req.method === "POST" && path === "/abort") { await conversation.abort(context); return Response.json({ ok: true }); }
        if (req.method === "POST" && path === "/reset") {
            // Only the message log: `reset` writes a head marker, so the transcript
            // before it leaves the context while the agent document (model,
            // instructions), provider credentials and the files on disk stay as
            // they were. Nothing is deleted and the worker keeps running.
            await conversation.abort(context).catch(() => {});
            await conversation.waitForIdle(context).catch(() => {});
            await conversation.reset(undefined, context);
            return Response.json({ ok: true });
        }
        return new Response("Not found", { status: 404 });
    } catch (e: any) { return Response.json({ error: e.message }, { status: 500 }); }
} });
harness.closed.then(end => { if (end.reason === "failed") process.exit(1); });
async function stop() { providerAuth.cancel(); view.dispose(); await harness.close(context); process.exit(0); }
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
