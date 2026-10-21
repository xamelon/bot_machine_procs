(() => {
  if (window.__asxTokenizer) return;
  window.__asxTokenizer = true;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const values = root => [...root.querySelectorAll('[data-asx-token-hidden]')].map(x => x.value);
  const paint = root => {
    const vals = values(root), name = root.dataset.name;
    const box = root.querySelector('[data-asx-token-box]'), input = root.querySelector('[data-asx-token-input]');
    [...box.querySelectorAll('.asx-token')].forEach(x => x.remove());
    vals.forEach(v => input.insertAdjacentHTML('beforebegin', window.asxToken({ label: v, removable: true, attrs: `data-value="${esc(v)}"`, removeAttrs: `data-asx-token-remove="${esc(v)}"` })));
    root.querySelector('[data-asx-token-hidden-box]').innerHTML = vals.map(v => `<input type="hidden" name="${esc(name)}" value="${esc(v)}" data-asx-token-hidden>`).join('');
  };
  const add = (root, value) => {
    value = value.trim(); if (!value || values(root).includes(value)) return;
    root.querySelector('[data-asx-token-hidden-box]').insertAdjacentHTML('beforeend', `<input type="hidden" name="${esc(root.dataset.name)}" value="${esc(value)}" data-asx-token-hidden>`);
    root.querySelector('[data-asx-token-input]').value = ''; paint(root); root.querySelector('[data-asx-token-menu]').hidden = true;
  };
  const suggest = root => {
    const q = root.querySelector('[data-asx-token-input]').value.toLowerCase();
    const current = new Set(values(root));
    const items = JSON.parse(root.dataset.suggestions || '[]').filter(x => x.toLowerCase().includes(q) && !current.has(x));
    const menu = root.querySelector('[data-asx-token-menu]');
    menu.innerHTML = items.map(x => `<button type="button" data-asx-token-suggestion="${esc(x)}">${esc(x)}</button>`).join('');
    menu.hidden = items.length === 0;
  };
  document.addEventListener('keydown', e => {
    if (!e.target.matches('[data-asx-token-input]')) return;
    const root = e.target.closest('[data-asx-tokenizer]');
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(root, e.target.value.replace(/,$/, '')); }
    if (e.key === 'Backspace' && !e.target.value) { const vals = values(root); vals.pop(); root.querySelector('[data-asx-token-hidden-box]').innerHTML = vals.map(v => `<input type="hidden" name="${esc(root.dataset.name)}" value="${esc(v)}" data-asx-token-hidden>`).join(''); paint(root); }
  });
  document.addEventListener('input', e => { if (e.target.matches('[data-asx-token-input]')) suggest(e.target.closest('[data-asx-tokenizer]')); });
  document.addEventListener('click', e => {
    const rm = e.target.closest('[data-asx-token-remove]');
    if (rm) { const root = rm.closest('[data-asx-tokenizer]'); root.querySelectorAll('[data-asx-token-hidden]').forEach(h => { if (h.value === rm.dataset.asxTokenRemove) h.remove(); }); paint(root); }
    const sug = e.target.closest('[data-asx-token-suggestion]');
    if (sug) add(sug.closest('[data-asx-tokenizer]'), sug.dataset.asxTokenSuggestion);
  });
})();
