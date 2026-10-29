import { test, expect } from "bun:test";
import { Window } from "happy-dom";
import { testCtx } from "../$test";

test("agent composer submits files without a prompt and renders native image messages", async () => {
    const ctx = await testCtx({ root: import.meta.dir + "/../.." });
    const window = new Window({ settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
    const calls: any[] = [];
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
    window.fetch = (async (_url: any, opts: any) => {
        if (opts?.body) { calls.push(JSON.parse(opts.body)); return new window.Response("{}"); }
        return new window.Response(JSON.stringify({ configured: true, entries: [{ model: [{ role: "user", content: [{ type: "image", mimeType: "image/png", data: png }] }] }] }));
    }) as any;
    try {
        window.EventSource = class {
            onmessage: any;
            constructor() { void window.fetch('/_agent/state').then(r => r.json()).then(data => this.onmessage?.({ data: JSON.stringify({ type: 'snapshot', ...data }) })); }
            close() {}
        } as any;
        window.document.write(ctx.fns.ui.layout({ main: "Example" }));
        const script = await Bun.file(import.meta.dir + "/$script_agent.js").text();
        new Function("document", "fetch", "crypto", "Event", "FileReader", "setTimeout", script)(window.document, window.fetch, window.crypto, window.Event, window.FileReader, window.setTimeout.bind(window));
        await Bun.sleep(30);
        expect(window.document.querySelector('img[alt="Attached image"]')?.getAttribute("src")).toBe("data:image/png;base64," + png);
        const picker = window.document.querySelector('input[name="attachments"]') as any;
        const list = new window.DataTransfer();
        list.items.add(new window.File(["Привет"], "notes.txt", { type: "text/plain" }));
        const form = window.document.querySelector('[data-asx-chat-composer]')!;
        expect(form.querySelector('[data-mode="dropzone"]')).toBeNull();
        expect(form.querySelector('[data-agent-attach] .ph-paperclip')).not.toBeNull();
        let picked = false;
        picker.click = () => { picked = true; };
        (form.querySelector('[data-agent-attach]') as any).click();
        expect(picked).toBe(true);
        const drop = new window.Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(drop, 'dataTransfer', { value: list });
        form.querySelector('textarea')!.dispatchEvent(drop);
        expect(picker.files.length).toBe(1);
        expect(form.querySelector('[data-agent-filename]')?.textContent).toBe('notes.txt');
        (form.querySelector('[data-agent-remove]') as any).click();
        expect(picker.files.length).toBe(0);
        const again = new window.Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(again, 'dataTransfer', { value: list });
        form.dispatchEvent(again);
        form.dispatchEvent(new window.Event("submit", { cancelable: true }));
        await Bun.sleep(80);
        expect(calls).toHaveLength(1);
        expect(calls[0].text).toBe("");
        expect(calls[0].attachments[0].name).toBe("notes.txt");
        expect(Buffer.from(calls[0].attachments[0].data, "base64").toString()).toBe("Привет");
        expect(picker.files.length).toBe(0);
    } finally { await window.happyDOM.close(); ctx.fns.procs.db.close({}); }
});
