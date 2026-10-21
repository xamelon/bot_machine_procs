(() => {
  if (window.__asxToast) return;
  window.__asxToast = true;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const viewport = () => document.querySelector('[data-asx-toast-viewport]') || document.body.appendChild(Object.assign(document.createElement('div'), {className: 'asx-toast-viewport'}));
  const dismiss = toast => { toast.dataset.exiting = 'true'; setTimeout(() => toast.remove(), 180); };
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-asx-toast-trigger]');
    if (!trigger) {
      const close = e.target.closest('[data-asx-toast-close]');
      if (close) dismiss(close.closest('.asx-toast'));
      return;
    }
    const toast = document.createElement('div');
    toast.className = 'asx-toast';
    toast.dataset.type = trigger.dataset.type || 'info';
    const action = trigger.dataset.actionLabel ? '<button class="asx-toast__action" type="button">' + esc(trigger.dataset.actionLabel) + '</button>' : '';
    toast.innerHTML = '<div class="asx-toast__content">' + esc(trigger.dataset.message || '') + '</div>' + action + '<button class="asx-toast__close" type="button" data-asx-toast-close aria-label="Dismiss">×</button>';
    viewport().appendChild(toast);
    const ms = Number(trigger.dataset.autohide || 0);
    if (ms > 0) setTimeout(() => toast.isConnected && dismiss(toast), ms);
  });
})();
