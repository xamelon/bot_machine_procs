(() => {
    if (document.documentElement.dataset.sandboxScrollReady) return;
    document.documentElement.dataset.sandboxScrollReady = '1';
    const mount = () => {
        const scroll = document.querySelector('.bot-sandbox-chat > .asx-chat-layout__messages');
        if (!scroll || scroll.dataset.scrollReady) return;
        scroll.dataset.scrollReady = '1';
        requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });
        // Lazy-loaded photos may change the height after the initial render.
        scroll.querySelectorAll('img').forEach(image => image.addEventListener('load', () => {
            scroll.scrollTop = scroll.scrollHeight;
        }, { once: true }));
    };
    mount();
    document.addEventListener('htmx:afterSettle', mount);
})();
