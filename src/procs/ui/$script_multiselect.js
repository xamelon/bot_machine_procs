(() => {
  if (window.__asxMultiselect) return;
  window.__asxMultiselect = true;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const parts = root => ({
    panel: root.querySelector('[data-asx-ms-panel]'),
    input: root.querySelector('[data-asx-ms-input]'),
    chips: root.querySelector('[data-asx-ms-chips]'),
    hidden: root.querySelector('[data-asx-ms-hidden-box]'),
    options: [...root.querySelectorAll('[data-asx-ms-option]')],
  });
  const labelFor = (root, value) => root.querySelector(`[data-asx-ms-option][data-value="${CSS.escape(value)}"] strong`)?.textContent ?? value;
  const values = root => parts(root).options.filter(o => o.getAttribute('aria-selected') === 'true').map(o => o.dataset.value);
  const paint = root => {
    const p = parts(root), vals = values(root), name = root.dataset.name;
    p.chips.innerHTML = vals.length ? vals.map(v => window.asxToken({ label: labelFor(root, v), removable: true, attrs: `data-value="${esc(v)}"`, removeAttrs: `data-asx-ms-remove="${esc(v)}"` })).join('') : `<span class="asx-multiselect__placeholder">${esc(root.dataset.placeholder || 'Select…')}</span>`;
    p.hidden.innerHTML = vals.map(v => `<input type="hidden" name="${esc(name)}" value="${esc(v)}" data-asx-ms-hidden="${esc(v)}">`).join('');
  };
  const closeAll = except => document.querySelectorAll('[data-asx-ms-root]').forEach(r => { if (r !== except) parts(r).panel.hidden = true; });

  document.addEventListener('click', e => {
    const root = e.target.closest('[data-asx-ms-root]');
    if (!root) return closeAll();
    const p = parts(root);
    if (e.target.closest('[data-asx-ms-trigger]') && !e.target.closest('[data-asx-ms-remove]')) {
      closeAll(root);
      p.panel.hidden = !p.panel.hidden;
      root.querySelector('[data-asx-ms-trigger]')?.setAttribute('aria-expanded', String(!p.panel.hidden));
      if (!p.panel.hidden) requestAnimationFrame(() => p.input.focus());
    }
    const remove = e.target.closest('[data-asx-ms-remove]');
    if (remove) { root.querySelector(`[data-asx-ms-option][data-value="${CSS.escape(remove.dataset.asxMsRemove)}"]`)?.setAttribute('aria-selected', 'false'); paint(root); }
    const option = e.target.closest('[data-asx-ms-option]');
    if (option) { option.setAttribute('aria-selected', option.getAttribute('aria-selected') === 'true' ? 'false' : 'true'); paint(root); }
  });
  document.addEventListener('input', e => {
    if (!e.target.matches('[data-asx-ms-input]')) return;
    const q = e.target.value.trim().toLowerCase();
    parts(e.target.closest('[data-asx-ms-root]')).options.forEach(o => o.hidden = q && !o.dataset.label.includes(q));
  });
  document.addEventListener('keydown', e => {
    const root = e.target.closest('[data-asx-ms-root]');
    if (root && (e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-asx-ms-trigger]')) {
      e.preventDefault(); e.target.click();
    }
    if (root && e.key === 'Escape') {
      parts(root).panel.hidden = true;
      root.querySelector('[data-asx-ms-trigger]')?.setAttribute('aria-expanded', 'false');
    }
  });
})();
