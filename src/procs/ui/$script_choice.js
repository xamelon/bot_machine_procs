(() => {
  if (window.__asxChoice) return;
  window.__asxChoice = true;
  let search = '';
  let searchTimer = 0;

  const parts = root => ({
    panel: root.querySelector('[data-asx-choice-panel]'),
    trigger: root.querySelector('[data-asx-choice-trigger]'),
    input: root.querySelector('[data-asx-choice-input]'),
    hidden: root.querySelector('[data-asx-choice-hidden]'),
    label: root.querySelector('[data-asx-choice-label]'),
    options: [...root.querySelectorAll('[data-asx-choice-option]')],
    empty: root.querySelector('[data-asx-choice-empty]'),
  });
  const visible = root => parts(root).options.filter(x => !x.hidden && !x.disabled && x.getAttribute('aria-disabled') !== 'true');
  const selected = root => parts(root).options.find(x => x.getAttribute('aria-selected') === 'true');
  const setActive = (root, option) => {
    visible(root).forEach(o => o.removeAttribute('data-active'));
    option?.setAttribute('data-active', 'true');
    option?.focus();
  };
  const close = (root, restore = false) => {
    const p = parts(root);
    p.panel.hidden = true;
    p.trigger?.setAttribute('aria-expanded', 'false');
    visible(root).forEach(o => o.removeAttribute('data-active'));
    if (restore) (p.input || p.trigger)?.focus();
  };
  const open = (root, focus = false) => {
    document.querySelectorAll('[data-asx-choice-root]').forEach(r => r !== root && close(r));
    const p = parts(root);
    if (p.input) filter(root, p.input.value);
    p.panel.hidden = false;
    p.trigger?.setAttribute('aria-expanded', 'true');
    if (focus) setActive(root, selected(root) || visible(root)[0]);
  };
  const filter = (root, q) => {
    const p = parts(root); q = q.trim().toLowerCase(); let shown = 0;
    p.options.forEach(o => { const ok = !q || o.dataset.label.includes(q); o.hidden = !ok; if (ok) shown++; });
    if (p.empty) p.empty.hidden = shown !== 0;
  };
  const choose = (root, option) => {
    if (!option || option.disabled || option.getAttribute('aria-disabled') === 'true') return;
    const p = parts(root);
    p.options.forEach(o => o.setAttribute('aria-selected', String(o === option)));
    p.hidden.value = option.dataset.value;
    const text = option.querySelector('strong')?.textContent || option.textContent.trim();
    if (p.label) p.label.textContent = text;
    if (p.input) p.input.value = text;
    close(root, true);
    p.hidden.dispatchEvent(new Event('change', {bubbles: true}));
  };
  const move = (root, delta) => {
    const items = visible(root); if (!items.length) return;
    const active = parts(root).panel.querySelector('[data-active]') || document.activeElement;
    const i = items.indexOf(active);
    setActive(root, items[(i + delta + items.length) % items.length]);
  };
  const jump = (root, toEnd = false) => {
    const items = visible(root); if (!items.length) return;
    setActive(root, toEnd ? items.at(-1) : items[0]);
  };
  const typeahead = (root, key) => {
    clearTimeout(searchTimer);
    search += key.toLowerCase();
    searchTimer = setTimeout(() => search = '', 650);
    const hit = visible(root).find(o => o.textContent.trim().toLowerCase().startsWith(search));
    if (hit) setActive(root, hit);
  };

  document.addEventListener('click', e => {
    const root = e.target.closest('[data-asx-choice-root]');
    if (!root) return document.querySelectorAll('[data-asx-choice-root]').forEach(r => close(r));
    const option = e.target.closest('[data-asx-choice-option]');
    if (option) return choose(root, option);
    if (e.target.closest('[data-asx-choice-trigger]')) return parts(root).panel.hidden ? open(root, root.dataset.mode !== 'typeahead') : close(root, true);
  });
  document.addEventListener('input', e => {
    if (!e.target.matches('[data-asx-choice-input]')) return;
    const root = e.target.closest('[data-asx-choice-root]');
    open(root, false); filter(root, e.target.value);
  });
  document.addEventListener('keydown', e => {
    const root = e.target.closest('[data-asx-choice-root]');
    if (!root) return;
    const p = parts(root);
    if (e.key === 'Escape') { e.preventDefault(); return close(root, true); }
    if (e.key === 'ArrowDown') { e.preventDefault(); open(root, true); return move(root, 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); open(root, true); return move(root, -1); }
    if (e.key === 'Home' && !e.target.matches('input')) { e.preventDefault(); open(root, true); return jump(root, false); }
    if (e.key === 'End' && !e.target.matches('input')) { e.preventDefault(); open(root, true); return jump(root, true); }
    if (e.key === 'Enter') {
      const active = p.panel.querySelector('[data-active]') || (e.target.matches('[data-asx-choice-option]') ? e.target : null);
      if (active) { e.preventDefault(); return choose(root, active); }
      if (e.target.matches('[data-asx-choice-trigger]')) { e.preventDefault(); return open(root, true); }
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && !e.target.matches('input')) {
      open(root, true); typeahead(root, e.key);
    }
  });
})();
