(() => {
  if (window.asxToken) return;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  window.asxToken = ({label = '', value = '', icon = '', removable = false, selected = false, cls = '', attrs = '', removeAttrs = '', removeLabel = 'Remove'} = {}) =>
    `<span class="asx-token ${esc(cls)}"${selected ? ' data-selected="true"' : ''}${attrs ? ' ' + attrs : ''}>${icon ? `<i class="ph ${esc(icon)}" aria-hidden="true"></i>` : ''}<span class="asx-token__label">${esc(label)}</span>${value ? `<strong>${esc(value)}</strong>` : ''}${removable ? `<button class="asx-token__remove" type="button" aria-label="${esc(removeLabel)}"${removeAttrs ? ' ' + removeAttrs : ''}>×</button>` : ''}</span>`;
})();
