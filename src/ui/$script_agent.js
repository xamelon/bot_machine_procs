// Assistant prose uses the shared server-side procs.ui.markdown renderer.
(() => {
    const panel = document.querySelector('.agent-panel');
    if (!panel || panel.dataset.connected) return;
    panel.dataset.connected = '1';
    const form = panel.querySelector('[data-asx-chat-composer]');
    const messages = panel.querySelector('[data-agent-messages]');
    const scrollArea = panel.querySelector('.asx-chat-layout');
    const emptyState = messages.firstElementChild.cloneNode(true);
    const status = panel.querySelector('[data-agent-status]');
    const stop = panel.querySelector('[data-agent-stop]');
    const error = panel.querySelector('[data-agent-error]');
    const picker = form.elements.attachments;
    const attached = form.querySelector('[data-agent-attachments]');
    let selectedFiles = [];
    const showFiles = files => {
        selectedFiles = files;
        const transfer = new document.defaultView.DataTransfer();
        files.forEach(file => transfer.items.add(file));
        picker.files = transfer.files;
        attached.replaceChildren();
        attached.hidden = !files.length;
        attached.closest('.asx-chat-composer__header').hidden = !files.length;
        files.forEach((file, index) => {
            const chip = panel.querySelector('[data-agent-attachment]').content.cloneNode(true);
            const label = chip.querySelector('[data-agent-filename]');
            label.textContent = file.name; label.title = file.name;
            chip.querySelector('[data-agent-remove]').addEventListener('click', () => {
                if (!picker.disabled) showFiles(selectedFiles.filter((_, i) => i !== index));
            });
            attached.append(chip);
        });
    };
    const addFiles = files => {
        const next = [...selectedFiles, ...files];
        if (next.length > 5 || next.reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024 || next.some(file => file.size > 5 * 1024 * 1024)) {
            fail('At most 5 files, 5 MB per file, 10 MB total');
            showFiles(selectedFiles); return;
        }
        fail(''); showFiles(next);
    };
    form.querySelector('[data-agent-attach]').addEventListener('click', () => { if (!picker.disabled) picker.click(); });
    picker.addEventListener('change', () => { if (picker.files.length) addFiles([...picker.files]); else showFiles([]); });
    form.addEventListener('dragover', event => {
        if (picker.disabled || ![...(event.dataTransfer?.types || [])].includes('Files')) return;
        event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; form.dataset.dragging = 'true';
    });
    form.addEventListener('dragleave', event => { if (!form.contains(event.relatedTarget)) delete form.dataset.dragging; });
    form.addEventListener('drop', event => {
        event.preventDefault(); delete form.dataset.dragging;
        if (!picker.disabled) addFiles([...(event.dataTransfer?.files || [])]);
    });
    let fingerprint = '';
    const markdownCache = new Map();
    async function formatMessages(content) {
        const texts = new Set(content.filter(item => item.role === 'assistant').map(item => item.text));
        // Keep rendered history, but release abandoned streaming partials.
        for (const text of markdownCache.keys()) if (!texts.has(text)) markdownCache.delete(text);
        const missing = [...texts].filter(text => !markdownCache.has(text));
        try {
            for (let i = 0; i < missing.length; i += 128) {
                const batch = missing.slice(i, i + 128);
                const res = await fetch('/ui/markdown', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts: batch }) });
                if (!res.ok) break;
                const data = await res.json();
                if (!Array.isArray(data.html) || data.html.length !== batch.length || data.html.some(html => typeof html !== 'string')) break;
                batch.forEach((text, index) => markdownCache.set(text, data.html[index]));
            }
        } catch { /* Plain text remains readable if formatting is unavailable. */ }
        for (const item of content) if (item.role === 'assistant') item.html = markdownCache.get(item.text);
    }
    function fail(text) { error.textContent = text; error.hidden = !text; }
    async function api(path, body) {
        const res = await fetch('/_agent/' + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const raw = await res.text();
        let data;
        try { data = JSON.parse(raw); }
        catch { throw new Error('HTTP ' + res.status + (raw ? ': ' + raw : '')); }
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        return data;
    }
    async function refresh() {
        try {
            const data = await api('state');
            const content = [];
            const tools = new Map();
            const textOf = value => typeof value === 'string' ? value : (Array.isArray(value) ? value.filter(c => c.type === 'text' || !c.type).map(c => c.text || '').filter(Boolean).join('\n') : '');
            const pretty = value => value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2);
            function toolCall(id, name) {
                const key = String(id || 'orphan-' + content.length);
                if (!tools.has(key)) {
                    const item = { role: 'tool', key, name: name || 'Tool', status: 'pending', arguments: '', output: '' };
                    tools.set(key, item); content.push(item);
                }
                return tools.get(key);
            }
            function argumentsOf(item, args) {
                if (args == null) return;
                item.arguments = pretty(args);
                const target = args.path ?? args.file_path ?? args.file ?? args.url ?? args.command;
                item.target = typeof target === 'string' ? target.split('\n')[0] : '';
            }
            function addMessage(model) {
                if (model.role === 'toolResult' || model.role === 'tool') {
                    const item = toolCall(model.toolCallId, model.toolName || model.name);
                    item.status = model.isError ? 'error' : 'complete';
                    item.output = textOf(model.content) || (model.isError ? 'Tool call failed' : 'No text output');
                    item.durationMs = model.durationMs;
                    item.settled = true;
                    return;
                }
                // Keep tool calls out of assistant bubbles, retaining their order.
                let text = '';
                const flush = () => { if (text) content.push({ role: model.role, text }); text = ''; };
                if (typeof model.content === 'string') text = model.content;
                else for (const block of model.content || []) {
                    if (block.type === 'toolCall') {
                        flush();
                        const item = toolCall(block.id, block.name);
                        argumentsOf(item, block.arguments);
                    } else if (block.type === 'image') {
                        flush(); content.push({ role: model.role, text: '', image: block });
                    } else if (block.type === 'text' || !block.type) text += block.text || '';
                }
                flush();
                if (model.errorMessage || model.stopReason === 'error') content.push({ role: 'error', text: model.errorMessage || 'Model response failed' });
            }
            for (const entry of data.entries || []) for (const model of entry.model || []) addMessage(model);
            const live = data.docs?.['pi.live'] || {};
            const active = Boolean(live.run);
            status.textContent = active ? 'Working…' : !data.configured ? 'Model not configured' : 'Ready';
            // Stop means "stop this run", so it exists only while one is running.
            if (stop) stop.hidden = !active;
            if (live.generation?.message) addMessage(live.generation.message);
            if (live.generation?.retry) content.push({ role: 'error', text: 'Retrying model request: ' + live.generation.retry.error });
            for (const tool of [...(live.tools || []), ...(live.nestedTools || [])]) {
                const item = toolCall(tool.callId, tool.name);
                argumentsOf(item, tool.arguments);
                if (!item.settled) {
                    item.status = tool.summary?.isError ? 'error' : tool.status === 'done' ? 'complete' : tool.status === 'pending' ? 'pending' : 'running';
                    item.output = tool.summary?.error || pretty(tool.output);
                    item.durationMs = tool.summary?.durationMs;
                }
                item.diagnostics = (tool.diagnostics || []).filter(d => d.severity === 'error').map(d => d.message).join('\n');
                if (item.diagnostics) item.status = 'error';
            }
            for (const compaction of live.compactions || []) {
                content.push({ role: 'progress', text: 'Summarizing earlier messages…' });
                if (compaction.retry) content.push({ role: 'error', text: 'Retrying summary: ' + compaction.retry.error });
            }
            if (live.compactionFailure) content.push({ role: 'error', text: 'Summary failed: ' + live.compactionFailure.error });
            if (active) content.push({ role: 'progress', text: 'Pi is working…' });
            await formatMessages(content);
            const next = JSON.stringify(content);
            if (next !== fingerprint) {
                const atBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight < 60;
                const expanded = new Set([...messages.querySelectorAll('[data-tool-key][open]')].map(el => el.dataset.toolKey));
                const expandedBatches = new Set([...messages.querySelectorAll('[data-tool-batch-key][open]')].map(el => el.dataset.toolBatchKey));
                const focused = messages.contains(document.activeElement) ? document.activeElement.closest('[data-tool-key]')?.dataset.toolKey : null;
                const focusedBatch = !focused && messages.contains(document.activeElement) ? document.activeElement.closest('[data-tool-batch-key]')?.dataset.toolBatchKey : null;
                messages.replaceChildren();
                for (const item of content) {
                    if (item.role === 'tool') {
                        const node = panel.querySelector('[data-agent-tool]').content.cloneNode(true);
                        const call = node.querySelector('.asx-chat-tool-call');
                        call.dataset.toolKey = item.key;
                        call.dataset.status = item.status;
                        call.open = expanded.has(item.key);
                        call.querySelector('[data-tool-name]').textContent = item.name;
                        const target = call.querySelector('[data-tool-target]');
                        target.textContent = item.target || ''; target.title = item.target || ''; target.hidden = !item.target;
                        call.querySelector('[data-tool-status]').textContent = { pending: 'Waiting', running: 'Running', complete: 'Done', error: 'Failed' }[item.status];
                        call.querySelector('[data-tool-icon]').className = 'ph ' + { pending: 'ph-clock', running: 'ph-circle-notch', complete: 'ph-check-circle', error: 'ph-warning-circle' }[item.status];
                        const duration = call.querySelector('[data-tool-duration]');
                        duration.hidden = !Number.isFinite(item.durationMs);
                        duration.textContent = Number.isFinite(item.durationMs) ? (item.durationMs < 1000 ? Math.round(item.durationMs) + ' ms' : (item.durationMs / 1000).toFixed(1) + ' s') : '';
                        const args = call.querySelector('[data-tool-arguments]');
                        args.hidden = !item.arguments; args.querySelector('pre').textContent = item.arguments;
                        const result = call.querySelector('[data-tool-result]');
                        result.hidden = false;
                        result.querySelector('pre').textContent = [item.output, item.diagnostics].filter(Boolean).join('\n') || (item.status === 'complete' ? 'No text output' : 'Waiting for result…');
                        if (item.status === 'error') result.setAttribute('role', 'alert');
                        // Batch consecutive calls. Its first call is a stable key even
                        // while more calls arrive or their status/output changes.
                        const previous = messages.lastElementChild;
                        let batch;
                        if (previous?.matches('[data-tool-batch]')) {
                            batch = previous;
                            batch.querySelector('[data-tool-batch-list]').append(call);
                        } else {
                            batch = node.querySelector('[data-tool-batch]');
                            batch.dataset.toolBatchKey = item.key;
                            batch.open = expandedBatches.has(item.key);
                            messages.append(node);
                        }
                        const count = batch.querySelector('[data-tool-batch-list]').children.length;
                        batch.querySelector('[data-tool-batch-label]').textContent = count + (count === 1 ? ' tool called' : ' tools called');
                        if (item.status === 'error') batch.querySelector('summary').title = 'Contains failed tool calls';
                        if (batch.dataset.toolBatchKey === focusedBatch) batch.querySelector('summary').focus({ preventScroll: true });
                        if (item.key === focused) call.querySelector('summary').focus({ preventScroll: true });
                        continue;
                    }
                    const sender = item.role === 'user' || item.role === 'assistant' ? item.role : 'system';
                    const node = panel.querySelector(`[data-agent-message="${sender}"]`).content.cloneNode(true);
                    const body = node.querySelector('.asx-chat-message-bubble__body, .asx-chat-system-message > span');
                    if (sender === 'assistant' && item.html !== undefined) {
                        body.classList.add('asx-markdown');
                        body.innerHTML = item.html;
                    } else body.textContent = sender === 'system' ? (item.role === 'error' ? 'Error: ' : item.role === 'progress' ? '' : item.role + '\n') + item.text : item.text;
                    if (item.image && ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(item.image.mimeType)) {
                        const image = document.createElement('img');
                        image.src = `data:${item.image.mimeType};base64,${item.image.data}`;
                        image.alt = 'Attached image'; image.loading = 'lazy';
                        image.style.maxWidth = '100%'; image.style.maxHeight = '320px';
                        body.append(image);
                    }
                    if (item.role === 'error') body.setAttribute('role', 'alert');
                    messages.append(node);
                }
                if (!content.length) messages.append(emptyState.cloneNode(true));
                fingerprint = next;
                if (atBottom) scrollArea.scrollTop = scrollArea.scrollHeight;
            }
        } catch (e) { status.textContent = 'Disconnected'; fail(e.message); if (stop) stop.hidden = true; }
    }
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const input = form.elements.text;
        const picker = form.elements.attachments;
        const files = [...(picker?.files || [])];
        if (!input.value.trim() && !files.length) return;
        const button = form.querySelector('[type=submit]'); button.disabled = true; status.textContent = 'Submitting…'; fail('');
        // Retain the same id on uncertain transport failure; retry cannot duplicate admission.
        const text = input.value;
        try {
            if (files.length > 5 || files.reduce((n, file) => n + file.size, 0) > 10 * 1024 * 1024 || files.some(file => file.size > 5 * 1024 * 1024)) throw new Error('At most 5 files, 5 MB per file, 10 MB total');
            input.disabled = true; picker.disabled = true;
            const attachments = await Promise.all(files.map(file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ name: file.name, mimeType: file.type || 'application/octet-stream', data: String(reader.result).split(',')[1] });
                reader.onerror = () => reject(new Error('Cannot read ' + file.name));
                reader.readAsDataURL(file);
            })));
            const signature = JSON.stringify({ text, attachments });
            const requestId = form.dataset.pendingText === signature ? form.dataset.requestId : crypto.randomUUID();
            form.dataset.pendingText = signature; form.dataset.requestId = requestId;
            await api('submit', { text, attachments, requestId });
            input.value = ''; picker.value = '';
            picker.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            delete form.dataset.pendingText; delete form.dataset.requestId;
            if (stop) stop.hidden = false;
            await refresh(); scrollArea.scrollTop = scrollArea.scrollHeight;
        }
        catch (e) { fail(e.message); }
        finally { button.disabled = false; input.disabled = false; picker.disabled = false; }
    });
    panel.querySelector('[name=stop]').addEventListener('click', async () => { try { await api('abort', {}); await refresh(); } catch (e) { fail(e.message); } });
    // Clearing drops the message log out of the context: the worker, the chosen
    // model, the provider login and the instructions all stay as they are.
    panel.querySelector('[data-agent-clear]')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        if (!window.confirm('Clear the messages in this conversation? The model, provider login and instructions stay.')) return;
        button.disabled = true; fail('');
        status.textContent = 'Clearing…';
        try { await api('reset', {}); await refresh(); }
        catch (e) { fail(e.message); }
        finally { button.disabled = false; }
    });
    async function loop() { await refresh(); setTimeout(loop, document.hidden ? 5000 : 1000); }
    loop();
})();
