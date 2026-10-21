import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { Window } from "happy-dom";
import { testCtx } from "../$test";

test("provider UI answers pi-ai prompts without rendering secrets or unsafe login links", async () => {
    const ctx = await testCtx({ root: resolve(import.meta.dir, "../..") });
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    let login: any = null, connected = false;
    const calls: Array<{ path: string; body: any }> = [];
    const fetch = async (url: string, opts?: { body: string }) => {
        const path = String(url).replace('/_agent/', '');
        let data: any = {};
        if (path === 'state') data = { provider: 'test', model: 'test-model' };
        if (path === 'auth') data = { providers: [{ id: 'test', name: 'Test', connected, methods: ['api_key'], models: [{ id: 'test-model', name: 'Model' }] }], login };
        if (opts?.body) {
            const body = JSON.parse(opts.body); calls.push({ path, body });
            if (path === 'auth/login') login = { id: 'login-1', status: 'running', events: [{ type: 'auth_url', url: 'javascript:alert(1)' }, { type: 'auth_url', url: 'https://example.com/login' }], prompt: { id: 'prompt-1', type: 'secret', message: 'API key' } };
            if (path === 'auth/respond') { connected = true; login = { ...login, status: 'done', prompt: null }; }
            if (path === 'auth/logout') { connected = false; login = null; }
        }
        return new window.Response(JSON.stringify(data));
    };
    try {
        window.document.write(ctx.fns.ui.providers());
        const run = new Function('document', 'fetch', 'URL', 'setTimeout', 'clearTimeout', await Bun.file(resolve(import.meta.dir, '$script_providers.js')).text());
        run(window.document, fetch, URL, window.setTimeout.bind(window), window.clearTimeout.bind(window));
        const root = window.document.querySelector('[data-providers]')!;
        expect(root.tagName).toBe('DIALOG');
        expect(root.getAttribute('aria-labelledby')).toBe('llm-providers-title');
        expect(window.document.querySelector('[data-asx-dialog-open="llm-providers"] button')?.textContent).toContain('Providers');
        root.setAttribute('open', ''); root.dispatchEvent(new window.Event('toggle'));
        await Bun.sleep(20);
        const connect = root.querySelector('[data-provider-connect]')!;
        connect.dispatchEvent(new window.Event('submit', { cancelable: true }));
        await Bun.sleep(20);
        expect(root.querySelector('[data-provider-error]')?.textContent).toBe('');
        expect(root.querySelectorAll('[data-provider-events] a').length).toBe(1);
        const input = root.querySelector<HTMLInputElement>('[name=answer]')!;
        expect(input.type).toBe('password');
        input.value = 'discarded-secret';
        root.dispatchEvent(new window.Event('close'));
        expect(input.value).toBe('');
        input.value = 'private-api-key';
        root.querySelector('[data-provider-prompt]')!.dispatchEvent(new window.Event('submit', { cancelable: true }));
        await Bun.sleep(20);
        expect(calls[1].body).toEqual({ id: 'login-1', promptId: 'prompt-1', value: 'private-api-key' });
        expect(input.value).toBe('');
        expect(root.textContent).not.toContain('private-api-key');
        root.querySelector('[data-provider-model]')!.dispatchEvent(new window.Event('submit', { cancelable: true }));
        await Bun.sleep(20);
        expect(calls[2]).toEqual({ path: 'model', body: { provider: 'test', modelId: 'test-model' } });
        root.querySelector<HTMLButtonElement>('[name=logout]')!.click();
        await Bun.sleep(20);
        expect(calls[3].path).toBe('auth/logout');
    } finally { await window.happyDOM.close(); }
});
