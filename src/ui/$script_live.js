// Bot shell owns its reload policy. Unlike a #main swap, a full refresh also
// installs changed JS, chat templates and styles; the agent runs on the server.
(() => {
    const root = document.querySelector('.bot-workspace');
    if (!root || root.dataset.liveReload) return;
    root.dataset.liveReload = '1';
    const form = root.querySelector('[data-asx-chat-composer]');
    const input = form?.elements.text;
    const key = 'bot.agent.draft';
    const revision = Number(document.querySelector('meta[name="bot-live-revision"]')?.content || 0);
    let timer = null, reloading = false;
    function saveDraft() {
        if (!input) return;
        try {
            if (!input.value) { sessionStorage.removeItem(key); return; }
            sessionStorage.setItem(key, JSON.stringify({ text: input.value, start: input.selectionStart, end: input.selectionEnd, requestId: form.dataset.requestId, pendingText: form.dataset.pendingText }));
        } catch { /* Storage can be disabled; reload must still work. */ }
    }
    try {
        const draft = JSON.parse(sessionStorage.getItem(key) || 'null');
        if (input && !input.value && typeof draft?.text === 'string') {
            input.value = draft.text;
            if (typeof draft.requestId === 'string' && draft.pendingText === draft.text) {
                form.dataset.requestId = draft.requestId;
                form.dataset.pendingText = draft.pendingText;
            }
            if (Number.isInteger(draft.start) && Number.isInteger(draft.end)) input.setSelectionRange(draft.start, draft.end);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        sessionStorage.removeItem(key);
    } catch { /* Ignore stale or unavailable storage. */ }
    window.addEventListener('beforeunload', saveDraft);
    function reload() {
        timer = null;
        // Keep the conversation and selected files alive while the agent edits.
        // Server-side hot reload continues; navigation waits for one idle window.
        const panel = root.querySelector('.agent-panel');
        const agentBusy = panel && panel.dataset.agentBusy !== 'false';
        const attachments = form?.elements.attachments?.files?.length;
        if (agentBusy || attachments || form?.querySelector('[type=submit]')?.disabled) {
            timer = setTimeout(reload, 300);
            return;
        }
        if (reloading) return;
        reloading = true;
        saveDraft();
        window.location.reload();
    }
    document.addEventListener('hyper-events', event => {
        const data = event.detail;
        if (data?.type !== 'reload' && !(data?.type === 'hello' && Number.isFinite(data.revision) && data.revision !== revision)) return;
        if (reloading) return;
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(reload, 300);
    });
})();
