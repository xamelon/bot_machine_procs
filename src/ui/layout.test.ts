import { test, expect } from "bun:test";
import { resolve, join } from "node:path";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { testCtx } from "../$test";
import { Window } from "happy-dom";

test("bot_procs shell keeps bot navigation, active page and Pi chat together", async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, "../..") });
    ctx.session = { url: new URL("http://localhost/bot/channels") };
    const html = ctx.fns.ui.layout({ title: "Channels", main: "Page content $&" });
    const nav = html.indexOf('class="asx-side-nav');
    const main = html.indexOf('<main id="main"');
    const chat = html.indexOf('class="agent-panel"');
    expect(nav).toBeGreaterThan(-1);
    expect(main).toBeGreaterThan(nav);
    expect(chat).toBeGreaterThan(main);
    expect(html).toContain('data-active="true" href="/bot/channels"');
    expect(html.match(/<main\b/g)?.length).toBe(1);
    expect(html).toContain("Page content $&");
    expect(html).toContain("data-asx-chat-composer");
    expect(html).toContain("asx-chat-layout");
    expect(html).toContain('data-agent-message="user"');
    expect(html).toContain('data-agent-message="assistant"');
    expect(html.match(/<template data-agent-message="assistant">([\s\S]*?)<\/template>/)?.[1]).toContain('data-variant="ghost"');
    expect(html.match(/<template data-agent-message="user">([\s\S]*?)<\/template>/)?.[1]).toContain('data-variant="filled"');
    expect(html).toContain('bot-workspace');
    expect(html).toContain('data-asx-resize-handle');
    expect(html).toContain('data-agent-collapse');
    expect(html).toContain('data-agent-open');
    expect(html).toContain('/ui/workbench.js');
});

test("an app with no UI files inherits the core chat shell, Providers and browser assets", async () => {
    const root = await mkdtemp(join(tmpdir(), 'bot-core-chat-'));
    let ctx: any;
    try {
        await mkdir(join(root, 'src'));
        await Bun.write(join(root, 'package.json'), JSON.stringify({ name: 'chat-shell-test', private: true }));
        ctx = await testCtx({ root, workdir: root });
        const res = await ctx.fns.procs.http.dispatch({ url: '/bot/channels' });
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('bot-workspace');
        expect(html).toContain('aria-label="Coding agent"');
        expect(html).toContain('data-agent-collapse');
        expect(html).toContain('data-providers');
        expect(html.match(/<main\b/g)?.length).toBe(1);
        for (const path of ['/ui/agent.js', '/ui/workbench.js', '/ui/providers.js', '/ui/agent.css']) {
            const asset = await ctx.fns.procs.http.dispatch({ url: path });
            expect(asset.status).toBe(200);
            expect((await asset.text()).length).toBeGreaterThan(0);
        }
    } finally {
        ctx?.fns.procs.db.close({});
        await rm(root, { recursive: true, force: true });
    }
});

test("Pi client uses UI templates safely and preserves submit retry and stop", async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, "../..") });
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    const calls: Array<{ path: string; body: any }> = [];
    window.fetch = (async (url: string, opts?: { body: string }) => {
        const path = String(url).split("/").pop()!;
        if (path === "state") return new window.Response(JSON.stringify({ configured: true, entries: [{ model: [
            { role: "user", content: "Hello" },
            { role: "assistant", content: "<img src=x onerror=alert(1)>" },
            { role: "tool", content: "Tool result" },
        ] }] }));
        calls.push({ path, body: JSON.parse(opts!.body) });
        return new window.Response(JSON.stringify(path === "submit" && calls.length === 1 ? { error: "Try again" } : {}), { status: calls.length === 1 ? 503 : 200 });
    }) as any;
    try {
        window.document.write(ctx.fns.ui.layout({ main: "Page" }));
        const run = new Function("document", "fetch", "crypto", "Event", "setTimeout", await Bun.file(resolve(import.meta.dir, "$script_agent.js")).text());
        run(window.document, window.fetch, window.crypto, window.Event, window.setTimeout.bind(window));
        const settle = () => Bun.sleep(20);
        await settle();
        const document = window.document;
        expect(document.querySelectorAll('[data-agent-messages] .asx-chat-message').length).toBe(2);
        expect(document.querySelector('[data-agent-messages] img')).toBeNull();
        expect(document.querySelector('.asx-chat-system-message')?.textContent).toContain("Tool result");
        const input = document.querySelector<HTMLTextAreaElement>('textarea[name=text]')!;
        const form = document.querySelector('[data-asx-chat-composer]')!;
        input.value = "Make a change";
        form.dispatchEvent(new window.Event("submit", { cancelable: true }));
        await settle();
        expect(document.querySelector('[data-agent-error]')?.textContent).toBe("Try again");
        expect(input.value).toBe("Make a change");
        form.dispatchEvent(new window.Event("submit", { cancelable: true }));
        await settle();
        expect(calls[1].body.requestId).toBe(calls[0].body.requestId);
        expect(input.value).toBe("");
        document.querySelector<HTMLButtonElement>('[name=stop]')!.click();
        await settle();
        expect(calls[2].path).toBe("abort");
    } finally {
        await window.happyDOM.close();
    }
});
