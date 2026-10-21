import { test, expect } from "bun:test";
import { createModels } from "@earendil-works/pi-ai/models";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import auth from "./auth";

test("OAuth callbacks, prompt answers, cancellation and token refresh stay owned by pi-ai", async () => {
    const models = createModels();
    let refreshed = 0;
    const deviceId = crypto.randomUUID();
    models.setProvider({ ...openaiProvider(), id: "test-oauth", name: "Test OAuth", getModels: () => [], auth: { oauth: {
        name: "Test OAuth",
        async login(interaction, options) {
            expect(options?.getDeviceId?.()).toBe(deviceId);
            interaction.notify({ type: "auth_url", url: "https://example.com/login" });
            interaction.notify({ type: "device_code", userCode: "ABCD", verificationUri: "https://example.com/device" });
            const choice = await interaction.prompt({ type: "select", message: "Method", options: [{ id: "manual", label: "Manual" }] });
            expect(choice).toBe("manual");
            const value = await interaction.prompt({ type: "manual_code", message: "Paste callback" });
            expect(value).toBe("callback-code");
            return { type: "oauth", access: "private-access", refresh: "private-refresh", expires: Date.now() - 1 };
        },
        async refresh(c) { refreshed++; return { ...c, access: "refreshed-access", expires: Date.now() + 3_600_000 }; },
        async toAuth(c) { return { apiKey: c.access }; },
    } } });
    const bridge = auth(models, { getDeviceId: () => deviceId });
    const request = async (path: string, body?: any) => bridge.handle(new Request("http://localhost" + path, body ? { method: "POST", body: JSON.stringify(body) } : {}));
    try {
        await request("/auth/login", { providerId: "test-oauth", type: "oauth" });
        await Bun.sleep(10);
        let state = bridge.snapshot()!;
        expect(state.events.length).toBe(2);
        expect((await request("/auth/respond", { id: state.id, promptId: state.prompt.id, value: "invalid" }))!.status).toBe(400);
        await request("/auth/respond", { id: state.id, promptId: state.prompt.id, value: "manual" });
        await Bun.sleep(10);
        state = bridge.snapshot()!;
        expect(state.prompt.type).toBe("manual_code");
        await request("/auth/respond", { id: state.id, promptId: state.prompt.id, value: "callback-code" });
        await Bun.sleep(10);
        expect(bridge.snapshot()?.status).toBe("done");
        expect(JSON.stringify(await (await request("/auth"))!.json())).not.toContain("private-access");
        expect((await models.getAuth("test-oauth"))?.auth.apiKey).toBe("refreshed-access");
        expect(refreshed).toBe(1);
        await request("/auth/logout", { providerId: "test-oauth" });
        expect(await models.checkAuth("test-oauth")).toBeUndefined();
    } finally { bridge.cancel(); }
});
