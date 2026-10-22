// Custom CA trust must reach provisioning AND messages, never other platforms.
import { test, expect } from "bun:test";
import { rootCertificates } from "node:tls";
import { X509Certificate } from "node:crypto";
import { testCtx } from "../$test";

test("MAX extends request-local trust for provisioning and sends only", async () => {
    const ctx = await testCtx({ env: { PUBLIC_BASE_URL: "https://bot.example.test" } });
    const original = globalThis.fetch;
    const calls: Array<{ url: string; init: BunFetchRequestInit }> = [];
    globalThis.fetch = (async (url: any, init: BunFetchRequestInit = {}) => {
        calls.push({ url: String(url), init });
        return Response.json(String(url).endsWith("/me") ? { username: "test_bot" } : { ok: true, message: { body: { mid: "test" } } });
    }) as typeof fetch;
    try {
        const connection = { public_id: "conn_test", credentials: { access_token: "not-real" } };
        const provision = await ctx.fns.procs.hooks.first({ name: "bot.adapter.max", opts: { phase: "provision", connection } });
        expect(provision.ok).toBe(true);
        const send = await ctx.fns.procs.hooks.first({ name: "bot.adapter.max", opts: { phase: "send", connection, message: { external_id: "123", text: "test" } } });
        expect(send.ok).toBe(true);
        expect(calls.map(c => new URL(c.url).pathname)).toEqual(["/subscriptions", "/me", "/messages"]);
        for (const { init } of calls) {
            expect(init.tls?.rejectUnauthorized).toBe(true);
            const ca = init.tls!.ca as string[];
            expect(ca.slice(0, rootCertificates.length)).toEqual([...rootCertificates]);
            const certs = ca.at(-1)!.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g)!;
            expect(certs.length).toBe(2);
            const root = new X509Certificate(certs[0]!);
            const sub = new X509Certificate(certs[1]!);
            expect(root.fingerprint256.replaceAll(":", "")).toBe("D26D2D0231B7C39F92CC738512BA54103519E4405D68B5BD703E9788CA8ECF31");
            expect(sub.verify(root.publicKey)).toBe(true);
            for (const cert of [root, sub]) expect(Date.parse(cert.validTo)).toBeGreaterThan(Date.now());
        }
        for (const channel of ["telegram", "vk"] as const) {
            await ctx.fns.bot.platformFetch({ channel, url: `https://${channel}.example.test` });
            expect(calls.at(-1)!.init.tls).toBeUndefined();
        }
    } finally {
        globalThis.fetch = original;
        ctx.fns.procs.db.close({});
    }
});
