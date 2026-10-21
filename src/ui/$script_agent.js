(() => {
    const panel = document.querySelector('.agent-panel');
    if (!panel || panel.dataset.connected) return;
    panel.dataset.connected = '1';
    const form = panel.querySelector('[data-asx-chat-composer]');
    const messages = panel.querySelector('[data-agent-messages]');
    const scrollArea = panel.querySelector('.asx-chat-layout');
    const emptyState = messages.firstElementChild.cloneNode(true);
    const status = panel.querySelector('[data-agent-status]');
    const error = panel.querySelector('[data-agent-error]');
    let fingerprint = '';
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
            function addMessage(model) {
                const text = typeof model.content === 'string' ? model.content : (model.content || []).map(c => c.text || (c.type === 'toolCall' ? c.name + ': ' + JSON.stringify(c.arguments) : '')).filter(Boolean).join('\n');
                if (text) content.push({ role: model.isError ? 'error' : model.role, text });
                if (model.errorMessage || model.stopReason === 'error') content.push({ role: 'error', text: model.errorMessage || 'Model response failed' });
                else if (model.isError && !text) content.push({ role: 'error', text: 'Tool call failed' });
            }
            for (const entry of data.entries || []) for (const model of entry.model || []) addMessage(model);
            const live = data.docs?.['pi.live'] || {};
            const active = Boolean(live.run);
            status.textContent = active ? 'Working…' : !data.configured ? 'Model not configured' : 'Ready';
            if (live.generation?.message) addMessage(live.generation.message);
            if (active) content.push({ role: 'progress', text: 'Pi is working…' });
            if (live.generation?.retry) content.push({ role: 'error', text: 'Retrying model request: ' + live.generation.retry.error });
            for (const tool of [...(live.tools || []), ...(live.nestedTools || [])]) {
                content.push({ role: 'progress', text: tool.name + ': ' + tool.status + (tool.output ? '\n' + tool.output : '') });
                if (tool.summary?.isError) content.push({ role: 'error', text: tool.summary.error || tool.name + ': failed' });
                for (const diagnostic of tool.diagnostics || []) if (diagnostic.severity === 'error') content.push({ role: 'error', text: diagnostic.message });
            }
            for (const compaction of live.compactions || []) {
                content.push({ role: 'progress', text: 'Summarizing earlier messages…' });
                if (compaction.retry) content.push({ role: 'error', text: 'Retrying summary: ' + compaction.retry.error });
            }
            if (live.compactionFailure) content.push({ role: 'error', text: 'Summary failed: ' + live.compactionFailure.error });
            const next = JSON.stringify(content);
            if (next !== fingerprint) {
                const atBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight < 60;
                messages.replaceChildren();
                for (const item of content) {
                    const sender = item.role === 'user' || item.role === 'assistant' ? item.role : 'system';
                    const node = panel.querySelector(`[data-agent-message="${sender}"]`).content.cloneNode(true);
                    const body = node.querySelector('.asx-chat-message-bubble__body, .asx-chat-system-message > span');
                    body.textContent = sender === 'system' ? (item.role === 'error' ? 'Error: ' : item.role === 'progress' ? '' : item.role + '\n') + item.text : item.text;
                    if (item.role === 'error') body.setAttribute('role', 'alert');
                    messages.append(node);
                }
                if (!content.length) messages.append(emptyState.cloneNode(true));
                fingerprint = next;
                if (atBottom) scrollArea.scrollTop = scrollArea.scrollHeight;
            }
        } catch (e) { status.textContent = 'Disconnected'; fail(e.message); }
    }
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const input = form.elements.text;
        if (!input.value.trim()) return;
        const button = form.querySelector('[type=submit]'); button.disabled = true; status.textContent = 'Submitting…'; fail('');
        // Retain the same id on uncertain transport failure; retry cannot duplicate admission.
        const text = input.value;
        const requestId = form.dataset.pendingText === text ? form.dataset.requestId : crypto.randomUUID();
        form.dataset.pendingText = text; form.dataset.requestId = requestId;
        try { await api('submit', { text, requestId }); input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); delete form.dataset.pendingText; delete form.dataset.requestId; await refresh(); scrollArea.scrollTop = scrollArea.scrollHeight; }
        catch (e) { fail(e.message); }
        finally { button.disabled = false; }
    });
    panel.querySelector('[name=stop]').addEventListener('click', async () => { try { await api('abort', {}); await refresh(); } catch (e) { fail(e.message); } });
    async function loop() { await refresh(); setTimeout(loop, document.hidden ? 5000 : 1000); }
    loop();
})();
