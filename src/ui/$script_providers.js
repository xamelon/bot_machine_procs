(() => {
    const root = document.querySelector('[data-providers]');
    if (!root || root.dataset.connected) return;
    root.dataset.connected = '1';
    const connect = root.querySelector('[data-provider-connect]');
    const modelForm = root.querySelector('[data-provider-model]');
    const promptForm = root.querySelector('[data-provider-prompt]');
    const error = root.querySelector('[data-provider-error]');
    const status = root.querySelector('[data-provider-status]');
    const events = root.querySelector('[data-provider-events]');
    const cancel = root.querySelector('[name=cancelLogin]');
    let providers = [], login = null, timer, shownPrompt = '', eventSignature = '';
    const templates = new Map();
    async function api(path, body) {
        const res = await fetch('/_agent/' + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        return data;
    }
    function fail(e) { error.textContent = e?.message || ''; error.hidden = !e; }
    function setChoices(form, name, items, value) {
        const input = form.elements[name], control = input.closest('[data-asx-choice-root]');
        const list = control.querySelector('[role=listbox]');
        if (!templates.has(input)) templates.set(input, list.firstElementChild.cloneNode(true));
        const selected = items.find(i => i.value === value) || items[0];
        input.value = selected?.value || '';
        control.querySelector('[data-asx-choice-label]').textContent = selected?.label || 'None available';
        list.replaceChildren();
        for (const item of items) {
            const node = templates.get(input).cloneNode(true);
            node.dataset.value = item.value; node.dataset.label = item.label.toLowerCase();
            node.setAttribute('aria-selected', String(item.value === input.value));
            node.querySelector('strong').textContent = item.label;
            list.append(node);
        }
    }
    function providerChanged(selectedModel) {
        const provider = providers.find(p => p.id === connect.elements.provider.value);
        setChoices(connect, 'authType', (provider?.methods || []).map(value => ({ value, label: value === 'oauth' ? 'Account login (OAuth)' : 'API key' })), connect.elements.authType.value || (provider?.methods.includes('oauth') ? 'oauth' : 'api_key'));
        setChoices(modelForm, 'model', (provider?.models || []).map(m => ({ value: m.id, label: m.name })), selectedModel || modelForm.elements.model.value);
        if (!login || login.status !== 'running') status.textContent = provider?.connected ? 'Connected' + (provider.source ? ' via ' + provider.source : '') : 'Not connected';
    }
    function renderLogin(next) {
        login = next;
        cancel.hidden = login?.status !== 'running';
        connect.querySelector('[type=submit]').disabled = login?.status === 'running';
        const prompt = login?.prompt;
        promptForm.hidden = !prompt;
        if (login) status.textContent = login.status === 'done' ? 'Login complete. Choose a model below.' : login.status === 'running' ? 'Logging in…' : login.status;
        if (login?.error) fail(new Error(login.error));
        const signature = JSON.stringify(login?.events || []);
        if (signature !== eventSignature) {
            eventSignature = signature; events.replaceChildren();
            for (const event of login?.events || []) {
                const row = document.createElement('p');
                row.textContent = event.message || event.instructions || '';
                const links = event.type === 'auth_url' ? [{ url: event.url, label: 'Open login page' }] : event.type === 'device_code' ? [{ url: event.verificationUri, label: 'Open verification page' }] : event.links || [];
                if (event.userCode) row.append(document.createTextNode(' Code: ' + event.userCode));
                for (const link of links) {
                    try {
                        const url = new URL(link.url);
                        if (!['https:', 'http:'].includes(url.protocol)) continue;
                        const a = document.createElement('a'); a.href = url.href; a.textContent = link.label || 'Open'; a.target = '_blank'; a.rel = 'noopener noreferrer';
                        row.append(document.createTextNode(' '), a);
                    } catch {}
                }
                events.append(row);
            }
        }
        if (prompt && prompt.id !== shownPrompt) {
            shownPrompt = prompt.id;
            root.querySelector('[data-prompt-message]').textContent = prompt.message;
            const input = promptForm.elements.answer;
            input.value = ''; input.placeholder = prompt.placeholder || '';
            input.type = prompt.type === 'secret' || prompt.type === 'manual_code' ? 'password' : 'text';
            input.closest('.asx-field').hidden = prompt.type === 'select'; input.disabled = prompt.type === 'select';
            root.querySelector('[data-prompt-choices]').hidden = prompt.type !== 'select';
            if (prompt.type === 'select') setChoices(promptForm, 'choice', prompt.options.map(o => ({ value: o.id, label: o.label })));
            else if (root.open) input.focus();
        }
        if (!prompt) { shownPrompt = ''; promptForm.elements.answer.value = ''; }
    }
    async function refresh() {
        clearTimeout(timer);
        const [data, state] = await Promise.all([api('auth'), api('state')]);
        providers = data.providers;
        setChoices(connect, 'provider', providers.map(p => ({ value: p.id, label: p.name })), connect.elements.provider.value || state.provider);
        providerChanged(state.provider === connect.elements.provider.value ? state.model : undefined);
        renderLogin(data.login);
        if (login?.status === 'running') timer = setTimeout(() => refresh().catch(fail), 1000);
    }
    async function perform(fn) { fail(null); try { await fn(); await refresh(); } catch (e) { fail(e); } }
    root.addEventListener('toggle', () => { if (root.open) refresh().catch(fail); });
    root.addEventListener('close', () => { promptForm.elements.answer.value = ''; shownPrompt = ''; });
    connect.elements.provider.addEventListener('change', () => providerChanged());
    connect.addEventListener('submit', e => { e.preventDefault(); perform(() => api('auth/login', { providerId: connect.elements.provider.value, type: connect.elements.authType.value })); });
    root.querySelector('[name=logout]').addEventListener('click', () => perform(() => api('auth/logout', { providerId: connect.elements.provider.value })));
    cancel.addEventListener('click', () => perform(() => api('auth/cancel', { id: login.id })));
    promptForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!login?.prompt) return;
        const body = { id: login.id, promptId: login.prompt.id, value: login.prompt.type === 'select' ? promptForm.elements.choice.value : promptForm.elements.answer.value };
        promptForm.elements.answer.value = '';
        perform(() => api('auth/respond', body));
    });
    modelForm.addEventListener('submit', async e => {
        e.preventDefault(); fail(null);
        try {
            await api('model', { provider: connect.elements.provider.value, modelId: modelForm.elements.model.value });
            await refresh(); status.textContent = 'Model selected';
        } catch (e) { fail(e); }
    });
})();
