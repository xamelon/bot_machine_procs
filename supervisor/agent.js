(() => {
    const panel = document.querySelector('.agent-panel');
    if (!panel || panel.dataset.connected) return;
    panel.dataset.connected = '1';
    const form = panel.querySelector('[data-agent-form]');
    const messages = panel.querySelector('[data-agent-messages]');
    const status = panel.querySelector('[data-agent-status]');
    const error = panel.querySelector('[data-agent-error]');
    let fingerprint = '';
    function fail(text) { error.textContent = text; error.hidden = !text; }
    async function api(path, body) {
        const res = await fetch('/_agent/' + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        return data;
    }
    async function refresh() {
        try {
            const data = await api('state');
            const content = [];
            for (const entry of data.entries || []) for (const model of entry.model || []) {
                const text = typeof model.content === 'string' ? model.content : (model.content || []).map(c => c.text || (c.type === 'toolCall' ? c.name + ': ' + JSON.stringify(c.arguments) : '')).filter(Boolean).join('\n');
                if (text) content.push({ role: model.role, text });
            }
            const live = data.docs?.['pi.live'] || {};
            const active = Object.keys(live).length > 0;
            status.textContent = !data.configured ? 'Model not configured' : active ? 'Working…' : 'Ready';
            // Keep raw committed live state visible while tooling/streaming is in progress.
            if (active) content.push({ role: 'progress', text: JSON.stringify(live, null, 2) });
            const next = JSON.stringify(content);
            if (next !== fingerprint) {
                const atBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 60;
                messages.replaceChildren();
                for (const item of content) {
                    const node = document.createElement('div'); node.className = 'agent-message'; node.dataset.role = item.role;
                    const label = document.createElement('small'); label.textContent = item.role;
                    node.append(label, document.createTextNode(item.text)); messages.append(node);
                }
                fingerprint = next;
                if (atBottom) messages.scrollTop = messages.scrollHeight;
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
        try { await api('submit', { text, requestId }); input.value = ''; delete form.dataset.pendingText; delete form.dataset.requestId; await refresh(); messages.scrollTop = messages.scrollHeight; }
        catch (e) { fail(e.message); }
        finally { button.disabled = false; }
    });
    panel.querySelector('[data-agent-stop]').addEventListener('click', async () => { try { await api('abort', {}); await refresh(); } catch (e) { fail(e.message); } });
    async function loop() { await refresh(); setTimeout(loop, document.hidden ? 5000 : 1000); }
    loop();
})();
