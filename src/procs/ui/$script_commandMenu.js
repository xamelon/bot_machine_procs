(() => {
  if (window.__asxCommandMenu) return;
  window.__asxCommandMenu = true;

  const roots = () => [...document.querySelectorAll('[data-asx-command-root]')];
  const parts = root => ({
    trigger: root.querySelector('[data-asx-command-trigger]'),
    panel: root.querySelector('[data-asx-command-panel]'),
    overlay: root.querySelector('[data-asx-command-overlay]'),
    input: root.querySelector('[data-asx-command-input]'),
    items: [...root.querySelectorAll('[data-asx-command-item]')],
    empty: root.querySelector('[data-asx-command-empty]'),
  });
  const open = root => {
    const p = parts(root);
    roots().forEach(r => r !== root && close(r));
    p.panel.hidden = false;
    p.overlay.hidden = false;
    p.input.value = '';
    filter(root, '');
    requestAnimationFrame(() => p.input.focus());
  };
  const close = root => {
    const p = parts(root);
    p.panel.hidden = true;
    p.overlay.hidden = true;
    p.trigger?.focus();
  };
  const filter = (root, q) => {
    const p = parts(root);
    let shown = 0;
    q = q.trim().toLowerCase();
    p.items.forEach(item => {
      const ok = !q || item.dataset.label.includes(q);
      item.hidden = !ok;
      if (ok) shown++;
    });
    p.empty.hidden = shown !== 0;
  };
  const move = (root, dir) => {
    const visible = parts(root).items.filter(x => !x.hidden);
    const i = visible.indexOf(document.activeElement);
    visible[(i + dir + visible.length) % visible.length]?.focus();
  };

  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-asx-command-trigger]');
    if (trigger) return open(trigger.closest('[data-asx-command-root]'));
    const overlay = e.target.closest('[data-asx-command-overlay]');
    if (overlay) return close(overlay.closest('[data-asx-command-root]'));
    if (e.target.closest('[data-asx-command-item]')) close(e.target.closest('[data-asx-command-root]'));
  });
  document.addEventListener('input', e => {
    if (e.target.matches('[data-asx-command-input]')) filter(e.target.closest('[data-asx-command-root]'), e.target.value);
  });
  document.addEventListener('keydown', e => {
    const root = e.target.closest('[data-asx-command-root]');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      open(document.querySelector('[data-asx-command-root]'));
    } else if (root && e.key === 'Escape') {
      e.preventDefault(); close(root);
    } else if (root && e.key === 'ArrowDown') {
      e.preventDefault(); move(root, 1);
    } else if (root && e.key === 'ArrowUp') {
      e.preventDefault(); move(root, -1);
    }
  });
})();
