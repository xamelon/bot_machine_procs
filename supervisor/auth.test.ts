import { test, expect } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createModels } from "@earendil-works/pi-ai/models";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import credentials from "./credentials";
import auth from "./auth";

test("pi-ai login/logout persist credentials without exposing secrets in HTTP state", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-auth-"));
    const path = join(root, "auth", "credentials.json");
    try {
        const store = await credentials(path);
        const models = createModels({ credentials: store, authContext: { env: async () => undefined, fileExists: async () => false } });
        models.setProvider(openaiProvider());
        const bridge = auth(models);
        const request = async (route: string, body?: any) => bridge.handle(new Request("http://localhost" + route, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }));
        const start = await (await request("/auth/login", { providerId: "openai", type: "api_key" }))!.json();
        await Bun.sleep(10);
        const state = await (await request("/auth"))!.json();
        expect(state.login.prompt.type).toBe("secret");
        expect((await request("/auth/respond", { id: start.login.id, promptId: "stale", value: "secret-key" }))!.status).toBe(409);
        await request("/auth/respond", { id: start.login.id, promptId: state.login.prompt.id, value: "secret-key" });
        await Bun.sleep(30);
        const done = await (await request("/auth"))!.json();
        expect(done.login.status).toBe("done");
        expect(JSON.stringify(done)).not.toContain("secret-key");
        expect(done.providers[0].connected).toBe(true);
        expect((await models.getAuth("openai"))?.auth.apiKey).toBe("secret-key");
        expect((await stat(path)).mode & 0o777).toBe(0o600);
        const reopened = await credentials(path);
        expect((await reopened.read("openai"))?.type).toBe("api_key");
        await request("/auth/logout", { providerId: "openai" });
        expect(await models.checkAuth("openai")).toBeUndefined();
        expect(await store.read("openai")).toBeUndefined();
        await request("/auth/login", { providerId: "openai", type: "api_key" });
        await Bun.sleep(10);
        bridge.cancel();
        await Bun.sleep(10);
        expect(bridge.snapshot()?.status).toBe("cancelled");
        expect(await store.read("openai")).toBeUndefined();
    } finally { await rm(root, { recursive: true, force: true }); }
});

test("credential writes across providers are serialized and a failed update preserves the old value", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-credentials-"));
    try {
        const store = await credentials(join(root, "auth", "credentials.json"));
        await Promise.all([store.modify("a", async () => { await Bun.sleep(20); return { type: "api_key", key: "a" }; }), store.modify("b", async () => ({ type: "api_key", key: "b" }))]);
        await expect(store.modify("a", async () => { throw new Error("failed refresh"); })).rejects.toThrow("failed refresh");
        expect(await store.list()).toEqual([{ providerId: "a", type: "api_key" }, { providerId: "b", type: "api_key" }]);
        const value: any = await store.read("a"); value.key = "changed";
        expect((await store.read("a") as any).key).toBe("a");
    } finally { await rm(root, { recursive: true, force: true }); }
});
