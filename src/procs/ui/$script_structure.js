(() => {
  if (window.__asxStructure) return;
  window.__asxStructure = true;

  document.addEventListener('click', e => {
    const toggle = e.target.closest('[data-asx-tree-toggle]');
    if (!toggle) return;
    const item = toggle.closest('.asx-tree-list__item');
    const open = item.getAttribute('aria-expanded') !== 'false';
    item.setAttribute('aria-expanded', String(!open));
  });

  let drag = null;
  const size = (root, handle, value) => {
    const next = Math.max(Number(handle.dataset.min ?? 20), Math.min(Number(handle.dataset.max ?? 80), value));
    root.style.setProperty('--asx-resizable-size', next + '%');
    handle.setAttribute('aria-valuenow', String(next));
  };
  const changed = root => root.dispatchEvent(new CustomEvent('asx:resize', { bubbles: true }));
  document.addEventListener('pointerdown', e => {
    const handle = e.target.closest('[data-asx-resize-handle]');
    if (!handle || e.button !== 0) return;
    const root = handle.closest('[data-asx-resizable]');
    if (!root) return;
    e.preventDefault();
    drag = { root, handle, pointerId: e.pointerId };
    handle.setPointerCapture(e.pointerId);
    handle.focus();
  });
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const rect = drag.root.getBoundingClientRect();
    if (rect.width) size(drag.root, drag.handle, (e.clientX - rect.left) / rect.width * 100);
  });
  const finish = e => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const root = drag.root;
    drag = null;
    changed(root);
  };
  document.addEventListener('pointerup', finish);
  document.addEventListener('pointercancel', finish);
  document.addEventListener('lostpointercapture', finish);
  document.addEventListener('keydown', e => {
    const handle = e.target.closest('[data-asx-resize-handle]');
    if (!handle || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const root = handle.closest('[data-asx-resizable]');
    if (!root) return;
    e.preventDefault();
    const current = parseFloat(root.style.getPropertyValue('--asx-resizable-size')) || 50;
    const next = e.key === 'Home' ? Number(handle.dataset.min ?? 20) : e.key === 'End' ? Number(handle.dataset.max ?? 80)
      : current + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1);
    size(root, handle, next);
    changed(root);
  });
})();
