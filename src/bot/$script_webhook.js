(() => {
    const mount = () => document.querySelectorAll('[data-bot-webhook]').forEach(root => {
        if (root.dataset.ready) return;
        root.dataset.ready = '1';
        const catalog = JSON.parse(root.dataset.flows);
        const field = name => root.querySelector(`[name="${name}"]`);
        const nodes = () => {
            const hidden = field('start_node_id');
            const selector = hidden.closest('[data-asx-choice-root]');
            const list = selector.querySelector('[role="listbox"]');
            list.replaceChildren();
            hidden.value = '';
            selector.querySelector('[data-asx-choice-label]').textContent = 'Flow start node';
            const ids = ['', ...(catalog.find(flow => flow.slug === field('flow_slug').value)?.nodes ?? [])];
            for (const id of ids) {
                const option = document.createElement('button');
                option.type = 'button';
                option.className = 'asx-selector__item';
                option.setAttribute('data-asx-choice-option', '');
                option.dataset.value = id;
                option.dataset.label = (id || 'Flow start node').toLowerCase();
                option.setAttribute('role', 'option');
                option.setAttribute('aria-selected', String(id === ''));
                const spacer = document.createElement('span');
                spacer.className = 'asx-selector__spacer';
                const label = document.createElement('strong');
                label.textContent = id || 'Flow start node';
                const check = document.createElement('i');
                check.className = 'ph ph-check asx-selector__check';
                check.setAttribute('aria-hidden', 'true');
                option.append(spacer, label, check);
                list.append(option);
            }
        };
        const preview = () => {
            const body = { secret: 'YOUR_WEBHOOK_SECRET', vk_user_id: field('vk_user_id').value || '42', connection_id: field('connection_id').value, flow_slug: field('flow_slug').value, session_mode: field('session_mode').value };
            for (const name of ['start_node_id', 'idempotency_key']) if (field(name).value) body[name] = field(name).value;
            root.querySelector('[data-bot-webhook-preview] code').textContent = JSON.stringify(body, null, 2);
        };
        field('flow_slug').addEventListener('change', () => { nodes(); preview(); });
        root.addEventListener('input', preview);
        root.addEventListener('change', preview);
        root.querySelectorAll('[data-bot-webhook-copy], [data-bot-webhook-copy-url]').forEach(button => button.addEventListener('click', async () => {
            const text = button.hasAttribute('data-bot-webhook-copy-url')
                ? root.querySelector('[data-bot-webhook-url]').value
                : root.querySelector('[data-bot-webhook-preview] code').textContent;
            const status = root.querySelector('[data-bot-webhook-copy-status]');
            try {
                if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
                else {
                    const input = document.createElement('textarea');
                    input.value = text;
                    input.setAttribute('readonly', '');
                    input.style.position = 'fixed';
                    input.style.opacity = '0';
                    document.body.append(input);
                    try {
                        input.select();
                        if (!document.execCommand('copy')) throw new Error('Copy unavailable');
                    } finally { input.remove(); }
                }
                status.textContent = 'Copied';
            } catch { status.textContent = 'Select the text and copy it manually.'; }
        }));
        nodes(); preview();
    });
    mount();
    document.addEventListener('htmx:afterSwap', mount);
})();
