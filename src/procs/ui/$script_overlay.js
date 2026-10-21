(() => {
  if (window.__asxOverlay) return;
  window.__asxOverlay = true;
  const closePopovers = except => document.querySelectorAll('[data-asx-popover-root]').forEach(r => {
    if (r !== except) r.querySelector('[data-asx-popover-panel]').hidden = true;
  });
  const closeContexts = () => document.querySelectorAll('[data-asx-context-panel]').forEach(p => p.hidden = true);

  document.addEventListener('click', e => {
    const pop = e.target.closest('[data-asx-popover-root]');
    if (pop && e.target.closest('[data-asx-popover-trigger]')) {
      closePopovers(pop);
      const panel = pop.querySelector('[data-asx-popover-panel]');
      panel.hidden = !panel.hidden;
      return;
    }
    if (!pop) closePopovers();
    if (!e.target.closest('[data-asx-context-panel]')) closeContexts();
  });

  document.addEventListener('contextmenu', e => {
    const area = e.target.closest('[data-asx-context-area]');
    if (!area) return;
    e.preventDefault();
    closeContexts();
    const root = area.closest('[data-asx-context-root]');
    const panel = root.querySelector('[data-asx-context-panel]');
    panel.hidden = false;
    const rect = root.getBoundingClientRect();
    panel.style.left = Math.min(e.clientX - rect.left, rect.width - 180) + 'px';
    panel.style.top = Math.max(0, e.clientY - rect.top) + 'px';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePopovers(); closeContexts(); }
  });
})();
