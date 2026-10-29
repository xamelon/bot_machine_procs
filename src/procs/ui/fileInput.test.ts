import { test, expect } from "bun:test";
import { Window } from "happy-dom";
import { testCtx } from "../../$test";

test("dropzone accepts dropped files, emits input/change, updates label and respects single/disabled inputs", async () => {
    const ctx = await testCtx();
    const window = new Window({ settings: { disableJavaScriptFileLoading: true } });
    try {
        window.document.body.innerHTML = ctx.fns.procs.ui.fileInput({ name: "files", mode: "dropzone", multiple: true });
        const script = await Bun.file(import.meta.dir + "/$script_inputBits.js").text();
        new Function("window", "document", "DataTransfer", "Event", script)(window, window.document, window.DataTransfer, window.Event);
        const root = window.document.querySelector('[data-asx-file]') as any;
        const input = root.querySelector('input') as any;
        const transfer = new window.DataTransfer();
        transfer.items.add(new window.File(["hello"], "notes.txt", { type: "text/plain" }));
        transfer.items.add(new window.File(["world"], "other.md", { type: "text/markdown" }));
        Object.defineProperty(transfer, 'types', { value: ['Files'] });
        let changes = 0;
        input.addEventListener('change', () => changes++);
        const event = (name: string) => {
            const e = new window.Event(name, { bubbles: true, cancelable: true });
            Object.defineProperty(e, 'dataTransfer', { value: transfer });
            return e;
        };
        const over = event('dragover');
        root.dispatchEvent(over);
        expect(over.defaultPrevented).toBe(true);
        expect(root.dataset.dragging).toBe('true');
        root.dispatchEvent(event('drop'));
        expect(input.files.length).toBe(2);
        expect(changes).toBe(1);
        expect(root.dataset.dragging).toBeUndefined();
        expect(root.querySelector('[data-asx-file-label]').textContent).toBe('notes.txt, other.md');
        input.multiple = false;
        root.dispatchEvent(event('drop'));
        expect(input.files.length).toBe(1);
        input.disabled = true;
        root.dispatchEvent(event('drop'));
        expect(changes).toBe(2);
    } finally { await window.happyDOM.close(); ctx.fns.procs.db.close({}); }
});
