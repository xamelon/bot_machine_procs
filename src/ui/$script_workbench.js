(() => {
    const root = document.querySelector('.bot-workspace');
    if (!root || root.dataset.wired) return;
    root.dataset.wired = '1';
    const panel = root.querySelector('.agent-panel');
    const rail = root.querySelector('.agent-rail');
    const handle = root.querySelector('[data-asx-resize-handle]');
    const collapse = root.querySelector('[data-agent-collapse]');
    const open = root.querySelector('[data-agent-open]');
    const scroll = panel.querySelector('.asx-chat-layout');
    let scrollTop = 0, followBottom = true;
    const desktop = window.matchMedia('(min-width: 1101px)');
    const key = 'bot.chat.layout';
    let saved = {};
    try { saved = JSON.parse(window.localStorage.getItem(key) || '{}') || {}; } catch {}
    let width = Number.isFinite(saved.width) && saved.width > 0 ? saved.width : 380;
    let available = 0;
    function persist() {
        try { window.localStorage.setItem(key, JSON.stringify({ width, collapsed: root.dataset.chatCollapsed === 'true' })); } catch {}
    }
    function layout() {
        if (!desktop.matches) return;
        const size = root.getBoundingClientRect().width;
        if (!size || size === available) return;
        available = size;
        const maximum = Math.max(320, size - 406);
        const actual = Math.min(maximum, Math.max(320, width));
        const percent = (size - actual - 6) / size * 100;
        root.style.setProperty('--asx-resizable-size', percent + '%');
        handle.dataset.min = String(400 / size * 100);
        handle.dataset.max = String((size - 326) / size * 100);
        handle.setAttribute('aria-valuemin', handle.dataset.min);
        handle.setAttribute('aria-valuemax', handle.dataset.max);
        handle.setAttribute('aria-valuenow', String(percent));
    }
    function rememberWidth() {
        if (!desktop.matches || root.dataset.chatCollapsed === 'true') return;
        const actual = panel.getBoundingClientRect().width;
        if (actual > 0) width = actual;
    }
    function setCollapsed(value, focus = false) {
        if (value) {
            rememberWidth();
            scrollTop = scroll.scrollTop;
            followBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 60;
        }
        root.dataset.chatCollapsed = String(value);
        panel.hidden = value;
        rail.hidden = !value;
        handle.hidden = value;
        collapse.setAttribute('aria-expanded', String(!value));
        open.setAttribute('aria-expanded', String(!value));
        if (!value && focus) scroll.scrollTop = followBottom ? scroll.scrollHeight : scrollTop;
        if (focus) (value ? open : collapse).focus();
    }
    handle.setAttribute('aria-label', 'Resize chat');
    handle.setAttribute('aria-controls', 'main coding-agent');
    layout();
    setCollapsed(saved.collapsed === true);
    collapse.addEventListener('click', () => { setCollapsed(true, true); persist(); });
    open.addEventListener('click', () => { setCollapsed(false, true); persist(); });
    root.addEventListener('asx:resize', () => { rememberWidth(); persist(); });
    new window.ResizeObserver(layout).observe(root);
    desktop.addEventListener('change', () => { available = 0; layout(); });
})();
