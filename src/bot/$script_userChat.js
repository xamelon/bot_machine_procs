(() => {
    if (document.documentElement.dataset.userChatMounted) return;
    document.documentElement.dataset.userChatMounted = '1';
    const mount = () => document.querySelectorAll('[data-user-chat]').forEach(root => {
        if (root.dataset.ready) return;
        root.dataset.ready = '1';
        const scroll = root.querySelector('[data-chat-scroll]');
        const list = scroll.querySelector('.asx-chat-message-list__inner');
        const status = root.querySelector('[data-chat-loading]');
        let loading = false;
        scroll.scrollTop = scroll.scrollHeight;
        let statusTimer;
        const refreshStatuses = async () => {
            if (!root.isConnected) return;
            const pending = [...root.querySelectorAll('[data-outbox-id]')].filter(node => ['pending', 'failed'].includes(node.dataset.outboxStatus)).slice(0, 100);
            if (!pending.length) return;
            try {
                const url = new URL(root.dataset.historyUrl.replace(/history$/, 'statuses'), location.origin);
                url.searchParams.set('ids', pending.map(node => node.dataset.outboxId).join(','));
                const response = await fetch(url);
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const data = await response.json();
                if (!root.isConnected) return;
                for (const row of data.rows) {
                    const node = root.querySelector(`[data-outbox-id="${row.id}"]`);
                    if (!node) continue;
                    node.dataset.outboxStatus = row.status;
                    const label = node.querySelector('[data-message-status]');
                    if (label) { label.textContent = row.status; label.title = row.last_error || ''; }
                }
            } catch { /* Retry status-only requests without interrupting the composer. */ }
            if (root.isConnected) statusTimer = setTimeout(refreshStatuses, 1500);
        };
        statusTimer = setTimeout(refreshStatuses, 500);
        const load = async () => {
            if (loading || !root.dataset.before || scroll.scrollTop > 80 || !root.isConnected) return;
            loading = true; status.textContent = 'Loading older messages…';
            try {
                const url = new URL(root.dataset.historyUrl, location.origin);
                url.searchParams.set('before', root.dataset.before);
                const response = await fetch(url, { headers: { Accept: 'text/html' } });
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const page = new DOMParser().parseFromString(await response.text(), 'text/html');
                const batch = page.querySelector('[data-user-chat]');
                if (!batch) throw new Error('Invalid history response');
                const height = scroll.scrollHeight, top = scroll.scrollTop;
                list.prepend(...batch.querySelector('.asx-chat-message-list__inner').children);
                root.dataset.before = batch.dataset.before;
                scroll.scrollTop = top + scroll.scrollHeight - height;
                if (root.isConnected) { clearTimeout(statusTimer); statusTimer = setTimeout(refreshStatuses, 500); }
                status.textContent = '';
            } catch (error) { status.textContent = 'Cannot load history: ' + error.message + '. Scroll to retry.'; }
            finally { loading = false; }
        };
        scroll.addEventListener('scroll', load, { passive: true });
        const form = root.querySelector('[data-form="user-chat-send"]');
        let sending = false;
        form?.addEventListener('submit', async event => {
            event.preventDefault();
            const input = form.elements.text;
            if (sending || !input.value.trim()) return;
            sending = true;
            const button = form.querySelector('[type="submit"]');
            button.disabled = true;
            if (form.dataset.pendingText !== input.value) {
                form.dataset.requestId = crypto.randomUUID();
                form.dataset.pendingText = input.value;
            }
            const body = new FormData(form);
            body.set('requestId', form.dataset.requestId);
            input.disabled = true;
            status.textContent = 'Sending…';
            try {
                const response = await fetch(form.action, { method: 'POST', body, headers: { Accept: 'application/json' } });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'HTTP ' + response.status);
                const page = new DOMParser().parseFromString(data.html, 'text/html');
                const next = page.querySelector('[data-user-chat]');
                if (!next) throw new Error('Invalid chat response');
                root.replaceWith(next);
                mount();
            } catch (error) { status.textContent = 'Send failed: ' + error.message; }
            finally { sending = false; button.disabled = false; input.disabled = false; }
        });
    });
    mount();
    document.addEventListener('htmx:afterSwap', mount);
})();
