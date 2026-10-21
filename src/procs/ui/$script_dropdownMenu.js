(() => {
  if (window.__asxDropdownMenu) return;
  window.__asxDropdownMenu = true;
  const parts = root => ({ trigger: root.querySelector('[data-asx-menu-trigger]'), panel: root.querySelector('[data-asx-menu-panel]'), items: [...root.querySelectorAll('[role=menuitem]:not([disabled]):not([aria-disabled=true])')] });
  const close = root => { const p = parts(root); p.panel.hidden = true; p.trigger?.setAttribute('aria-expanded', 'false'); };
  const open = root => { document.querySelectorAll('[data-asx-menu-root]').forEach(r => r !== root && close(r)); const p = parts(root); p.panel.hidden = false; p.trigger?.setAttribute('aria-expanded', 'true'); };
  const move = (root, dir) => { const p = parts(root), i = p.items.indexOf(document.activeElement); p.items[(i + dir + p.items.length) % p.items.length]?.focus(); };
  document.addEventListener('click', e => {
    const root = e.target.closest('[data-asx-menu-root]');
    if (!root) return document.querySelectorAll('[data-asx-menu-root]').forEach(close);
    if (e.target.closest('[data-asx-menu-trigger]')) return parts(root).panel.hidden ? open(root) : close(root);
    if (e.target.closest('[role=menuitem]')) close(root);
  });
  document.addEventListener('keydown', e => {
    const root = e.target.closest('[data-asx-menu-root]');
    if (!root) return;
    if (e.key === 'Escape') { e.preventDefault(); close(root); parts(root).trigger?.focus(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (parts(root).panel.hidden) open(root); move(root, 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (parts(root).panel.hidden) open(root); move(root, -1); }
  });
})();
