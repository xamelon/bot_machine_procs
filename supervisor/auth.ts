import type { Models } from "@earendil-works/pi-ai/models";

// HTTP adapter for pi-ai's interaction callbacks, not an OAuth implementation.
export default function auth(models: Models, options?: Parameters<Models["login"]>[3]) {
    let session: any = null;
    let pending: { id: string; resolve: (value: string) => void; reject: (error: Error) => void } | null = null;
    function snapshot() {
        if (!session) return null;
        const { id, providerId, type, status, events, prompt, error } = session;
        return { id, providerId, type, status, events, prompt, error };
    }
    function cancel() {
        if (!session || session.status !== "running") return;
        session.status = "cancelled";
        session.controller.abort();
        pending?.reject(new Error("Login cancelled")); pending = null;
        session.prompt = null; clearTimeout(session.timer);
    }
    return {
        snapshot, cancel,
        async handle(req: Request): Promise<Response | null> {
            const path = new URL(req.url).pathname;
            if (!path.startsWith("/auth")) return null;
            const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
            if (path === "/auth" && req.method === "GET") {
                const providers = await Promise.all(models.getProviders().filter(p => p.auth.apiKey?.login || p.auth.oauth).map(async p => {
                    const check = await models.checkAuth(p.id);
                    return {
                        id: p.id, name: p.name,
                        methods: [p.auth.apiKey?.login ? "api_key" : null, p.auth.oauth ? "oauth" : null].filter(Boolean),
                        connected: Boolean(check), source: check?.source,
                        models: models.getModels(p.id).map(m => ({ id: m.id, name: m.name })),
                    };
                }));
                return json({ providers, login: snapshot() });
            }
            if (req.method !== "POST") return json({ error: "Not found" }, 404);
            const body = await req.json();
            if (path === "/auth/respond") {
                if (!pending || body.id !== session?.id || body.promptId !== pending.id) return json({ error: "This login prompt has expired" }, 409);
                if (typeof body.value !== "string" || body.value.length > 16_000) return json({ error: "Invalid response" }, 400);
                if (session.prompt.type === "select" && !session.prompt.options.some((o: any) => o.id === body.value)) return json({ error: "Invalid choice" }, 400);
                const answer = pending; pending = null; session.prompt = null;
                answer.resolve(body.value);
                return json({ ok: true });
            }
            if (path === "/auth/cancel") {
                if (body.id !== session?.id) return json({ error: "Login changed" }, 409);
                cancel(); return json({ ok: true });
            }
            const provider = typeof body.providerId === "string" ? models.getProvider(body.providerId) : undefined;
            if (!provider) return json({ error: "Unknown provider" }, 400);
            if (path === "/auth/logout") {
                if (session?.status === "running" && session.providerId === provider.id) cancel();
                await models.logout(provider.id);
                if (session?.providerId === provider.id) session = null;
                return json({ ok: true });
            }
            if (path !== "/auth/login") return json({ error: "Not found" }, 404);
            if (body.type !== "api_key" && body.type !== "oauth") return json({ error: "Invalid auth method" }, 400);
            if (body.type === "api_key" ? !provider.auth.apiKey?.login : !provider.auth.oauth) return json({ error: "Auth method unavailable" }, 400);
            if (session?.status === "running") return json({ error: "Finish or cancel the current login" }, 409);
            const current = session = { id: crypto.randomUUID(), providerId: provider.id, type: body.type, status: "running", events: [], prompt: null, controller: new AbortController() };
            current.timer = setTimeout(cancel, 15 * 60_000);
            void models.login(provider.id, body.type, {
                signal: current.controller.signal,
                notify(event) { if (current.status === "running") current.events = [...current.events.slice(-19), event]; },
                prompt(prompt) {
                    return new Promise<string>((resolve, reject) => {
                        if (prompt.signal?.aborted || current.controller.signal.aborted) { reject(new Error("Login cancelled")); return; }
                        const id = crypto.randomUUID();
                        const onAbort = () => { if (pending?.id === id) { pending = null; current.prompt = null; } reject(new Error("Prompt cancelled")); };
                        prompt.signal?.addEventListener("abort", onAbort, { once: true });
                        const cleanup = () => prompt.signal?.removeEventListener("abort", onAbort);
                        pending = { id, resolve(value) { cleanup(); resolve(value); }, reject(error) { cleanup(); reject(error); } };
                        const { signal, ...publicPrompt } = prompt;
                        current.prompt = { ...publicPrompt, id };
                    });
                },
            }, options).then(async () => {
                await models.refresh({ providers: [provider.id], signal: current.controller.signal });
                if (current.status === "running") current.status = "done";
            })
                .catch(() => { if (current.status === "running") { current.status = "failed"; current.error = "Login failed. Retry or choose another authentication method."; } })
                .finally(() => { clearTimeout(current.timer); if (session === current) { pending = null; current.prompt = null; } });
            return json({ login: snapshot() }, 202);
        },
    };
}
