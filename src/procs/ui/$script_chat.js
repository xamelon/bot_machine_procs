(() => {
  if (window.__asxChat) return;
  window.__asxChat = true;
  const fit = el => {
    if (!el || el.tagName !== 'TEXTAREA') return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };
  document.addEventListener('input', e => {
    const input = e.target.closest('[data-asx-chat-input]');
    if (input) fit(input);
  });
  document.addEventListener('keydown', e => {
    const input = e.target.closest('[data-asx-chat-input]');
    if (!input) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const form = input.closest('[data-asx-chat-composer]');
      form?.requestSubmit?.();
    }
  });
  document.addEventListener('submit', e => {
    const form = e.target.closest('[data-asx-chat-composer]');
    if (!form) return;
    const input = form.querySelector('[data-asx-chat-input]');
    if (!input || !input.value.trim()) e.preventDefault();
  });
  document.addEventListener('click', e => {
    const drawerToggle = e.target.closest('[data-asx-chat-drawer-toggle]');
    if (drawerToggle) {
      const drawer = drawerToggle.closest('[data-asx-chat-drawer]');
      const next = drawer?.dataset.collapsed !== 'true';
      drawer.dataset.collapsed = next ? 'true' : 'false';
      drawerToggle.setAttribute('aria-expanded', next ? 'false' : 'true');
      return;
    }
    const btn = e.target.closest('[data-asx-chat-scroll-bottom]');
    if (!btn) return;
    const layout = btn.closest('.asx-chat-layout');
    const area = layout?.querySelector('.asx-chat-layout__messages');
    if (area) area.scrollTo({top: area.scrollHeight, behavior: 'smooth'});
  });
  document.querySelectorAll('[data-asx-chat-input]').forEach(fit);
})();
