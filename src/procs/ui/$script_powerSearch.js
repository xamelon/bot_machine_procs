(() => {
  if (window.__asxPowerSearch) return;
  window.__asxPowerSearch = true;

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const read = root => ({
    fields: JSON.parse(root.dataset.fields || '[]'),
    filters: JSON.parse(root.dataset.filters || '[]'),
    tokens: root.querySelector('[data-asx-ps-tokens]'),
    input: root.querySelector('[data-asx-ps-input]'),
    hidden: root.querySelector('[data-asx-ps-hidden]'),
    menu: root.querySelector('[data-asx-ps-menu]'),
    editor: root.querySelector('[data-asx-ps-editor]'),
    box: root.querySelector('[data-asx-ps-box]'),
  });
  const fieldOf = (root, key) => read(root).fields.find(f => f.key === key);
  const opOf = (field, key) => field?.operators?.find(o => o.key === key);
  const tokenLabel = (root, f) => {
    const field = fieldOf(root, f.field), op = opOf(field, f.operator);
    return {field: field?.label || f.field, op: op?.label || f.operator};
  };
  let menuSearch = '';
  let menuSearchTimer = 0;
  const menuItems = root => [...read(root).menu.querySelectorAll('[data-asx-ps-field]')];
  const moveMenu = (root, delta) => {
    const items = menuItems(root);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    items[(i + delta + items.length) % items.length].focus();
  };
  const jumpMenu = (root, end = false) => {
    const items = menuItems(root);
    if (!items.length) return;
    (end ? items.at(-1) : items[0])?.focus();
  };
  const typeaheadMenu = (root, key) => {
    clearTimeout(menuSearchTimer);
    menuSearch += key.toLowerCase();
    menuSearchTimer = setTimeout(() => menuSearch = '', 650);
    const hit = menuItems(root).find(x => x.textContent.trim().toLowerCase().startsWith(menuSearch));
    hit?.focus();
  };
  const removeAt = (root, index) => {
    const filters = read(root).filters;
    filters.splice(index, 1);
    writeFilters(root, filters);
    read(root).input.focus();
  };
  const writeFilters = (root, filters) => {
    root.dataset.filters = JSON.stringify(filters);
    const p = read(root);
    p.box.dataset.hasTokens = filters.length ? 'true' : 'false';
    p.hidden.value = root.dataset.tree === '1'
      ? JSON.stringify({ all: filters.map(f => ({ filter: f.field, op: f.operator, value: f.value ?? '' })) })
      : root.dataset.filters;
    p.tokens.innerHTML = filters.map((f, i) => {
      const label = tokenLabel(root, f);
      return window.asxToken({
        label: `${label.field}: ${label.op}`,
        value: f.value,
        removable: true,
        attrs: `role="button" tabindex="0" data-asx-ps-token="${i}"`,
        removeAttrs: `data-asx-ps-remove="${i}"`,
      });
    }).join('');
  };
  const close = (root, focusInput = false) => {
    const p = read(root);
    p.menu.hidden = true; p.editor.hidden = true; p.box.setAttribute('aria-expanded', 'false');
    if (focusInput) p.input.focus();
  };
  const openMenu = (root, focusFirst = false) => {
    document.querySelectorAll('[data-asx-ps-root]').forEach(r => r !== root && close(r));
    const p = read(root), q = p.input.value.trim().toLowerCase();
    const rows = p.fields.filter(f => !q || f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q));
    p.menu.innerHTML = rows.length ? rows.map(f => `<button class="asx-power-search__menu-item" type="button" data-asx-ps-field="${esc(f.key)}" role="option"><i class="ph ${esc(f.icon || 'ph-funnel')}" aria-hidden="true"></i><span>${esc(f.label)}</span></button>`).join('') : '<div class="asx-power-search__empty">No fields</div>';
    p.editor.hidden = true; p.menu.hidden = false; p.box.setAttribute('aria-expanded', 'true');
    if (focusFirst) requestAnimationFrame(() => menuItems(root)[0]?.focus());
  };
  const openEditor = (root, filter = null, index = '') => {
    const p = read(root), fields = p.fields;
    const first = fields[0];
    const field = fieldOf(root, filter?.field) || first;
    const op = opOf(field, filter?.operator) || field?.operators?.[0];
    const options = field?.operators?.map(o => `<option value="${esc(o.key)}" ${o.key === op?.key ? 'selected' : ''}>${esc(o.label)}</option>`).join('') || '';
    const fieldOptions = fields.map(f => `<option value="${esc(f.key)}" ${f.key === field?.key ? 'selected' : ''}>${esc(f.label)}</option>`).join('');
    const value = filter?.value || '';
    p.editor.dataset.index = index;
    p.editor.innerHTML = `<div class="asx-power-search__editor-card" role="dialog" aria-label="Filter editor">
      <div class="asx-power-search__editor-row">
        <label><span>Field</span><select class="asx-input" data-asx-ps-edit-field>${fieldOptions}</select></label>
        <label><span>Operator</span><select class="asx-input" data-asx-ps-edit-op>${options}</select></label>
      </div>
      <div data-asx-ps-value-slot></div>
      <div class="asx-power-search__editor-actions"><button class="asx-button" data-variant="ghost" data-size="sm" type="button" data-asx-ps-cancel>Cancel</button>${index !== '' ? '<button class="asx-button" data-variant="destructive" data-size="sm" type="button" data-asx-ps-delete>Delete</button>' : ''}<button class="asx-button" data-variant="primary" data-size="sm" type="button" data-asx-ps-apply>Apply</button></div>
    </div>`;
    renderValue(root, op, value);
    p.menu.hidden = true; p.editor.hidden = false; p.box.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => (p.editor.querySelector('[data-asx-ps-value]') || p.editor.querySelector('[data-asx-ps-edit-field]'))?.focus());
  };
  const checkbox = (x, checked) => `<label class="asx-checkbox"><input type="checkbox" value="${esc(x.value)}" ${checked ? 'checked' : ''}><span class="asx-checkbox__box"><i class="ph ph-check" aria-hidden="true"></i></span><span class="asx-checkbox__text"><span>${esc(x.label)}</span>${x.description ? `<small>${esc(x.description)}</small>` : ''}</span></label>`;
  const renderValue = (root, op, value = '') => {
    const slot = read(root).editor.querySelector('[data-asx-ps-value-slot]');
    if (!slot) return;
    if (op?.type === 'empty') { slot.innerHTML = '<div class="asx-power-search__empty-value">No value needed</div>'; return; }
    if (op?.type === 'select') {
      slot.innerHTML = `<label class="asx-power-search__value"><span>Value</span><select class="asx-input" data-asx-ps-value>${(op.options || []).map(x => `<option value="${esc(x.value)}" ${x.value === value ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label>`;
      return;
    }
    if (op?.type === 'enum_list' || op?.type === 'entity_list') {
      const selected = new Set(String(value || '').split(',').map(x => x.trim()).filter(Boolean));
      slot.innerHTML = `<div class="asx-power-search__value"><span class="asx-field__label">Value</span><div class="asx-checkbox-list" data-asx-ps-value-list>${(op.options || []).map(x => checkbox(x, selected.has(x.value))).join('')}</div></div>`;
      return;
    }
    if (op?.type === 'string_list') {
      slot.innerHTML = `<label class="asx-power-search__value"><span>Values</span><input class="asx-input" data-asx-ps-value type="text" value="${esc(value)}" placeholder="comma, separated, values"></label>`;
      return;
    }
    if (op?.type === 'date') {
      slot.innerHTML = `<label class="asx-power-search__value"><span>Date</span><input class="asx-input" data-asx-ps-value type="date" value="${esc(value)}"></label>`;
      return;
    }
    if (op?.type === 'date_range') {
      const [start = '', end = ''] = String(value || '').split('..');
      slot.innerHTML = `<div class="asx-power-search__range"><label><span>From</span><input class="asx-input" data-asx-ps-value-start type="date" value="${esc(start)}"></label><label><span>To</span><input class="asx-input" data-asx-ps-value-end type="date" value="${esc(end)}"></label></div>`;
      return;
    }
    slot.innerHTML = `<label class="asx-power-search__value"><span>Value</span><input class="asx-input" data-asx-ps-value type="${op?.type === 'number' ? 'number' : 'text'}" value="${esc(value)}" placeholder="Value"></label>`;
  };
  const selectedFilter = root => {
    const p = read(root), editor = p.editor;
    const fieldKey = editor.querySelector('[data-asx-ps-edit-field]')?.value;
    const opKey = editor.querySelector('[data-asx-ps-edit-op]')?.value;
    const op = opOf(fieldOf(root, fieldKey), opKey);
    let val = editor.querySelector('[data-asx-ps-value]')?.value || '';
    if (op?.type === 'enum_list' || op?.type === 'entity_list') val = [...editor.querySelectorAll('[data-asx-ps-value-list] input:checked')].map(x => x.value).join(',');
    if (op?.type === 'date_range') val = `${editor.querySelector('[data-asx-ps-value-start]')?.value || ''}..${editor.querySelector('[data-asx-ps-value-end]')?.value || ''}`;
    return {field: fieldKey, operator: opKey, ...(op?.type === 'empty' ? {} : {value: val})};
  };
  const applyEditor = root => {
    const p = read(root), filters = p.filters, next = selectedFilter(root), i = p.editor.dataset.index;
    i === '' ? filters.push(next) : filters[Number(i)] = next;
    writeFilters(root, filters); p.input.value = ''; close(root, true);
  };

  document.addEventListener('click', e => {
    const root = e.target.closest('[data-asx-ps-root]');
    if (!root) return document.querySelectorAll('[data-asx-ps-root]').forEach(r => close(r));
    const p = read(root);
    if (e.target.closest('[data-asx-ps-add]')) return openMenu(root, true);
    const remove = e.target.closest('[data-asx-ps-remove]');
    if (remove) { e.stopPropagation(); return removeAt(root, Number(remove.dataset.asxPsRemove)); }
    const token = e.target.closest('[data-asx-ps-token]');
    if (token) return openEditor(root, p.filters[Number(token.dataset.asxPsToken)], token.dataset.asxPsToken);
    const field = e.target.closest('[data-asx-ps-field]');
    if (field) return openEditor(root, {field: field.dataset.asxPsField});
    if (e.target.closest('[data-asx-ps-cancel]')) return close(root, true);
    if (e.target.closest('[data-asx-ps-delete]')) { const filters = p.filters; filters.splice(Number(p.editor.dataset.index), 1); writeFilters(root, filters); return close(root, true); }
    if (e.target.closest('[data-asx-ps-apply]')) return applyEditor(root);
    if (e.target.closest('[data-asx-ps-box]')) {
      p.input.focus();
      if (!p.input.value.trim()) openMenu(root, false);
      return;
    }
  });
  document.addEventListener('input', e => {
    const root = e.target.closest('[data-asx-ps-root]');
    if (root && e.target.matches('[data-asx-ps-input]')) openMenu(root);
  });
  document.addEventListener('change', e => {
    const root = e.target.closest('[data-asx-ps-root]');
    if (!root) return;
    if (e.target.matches('[data-asx-ps-edit-field]')) {
      const field = fieldOf(root, e.target.value);
      root.querySelector('[data-asx-ps-edit-op]').innerHTML = (field?.operators || []).map((o, i) => `<option value="${esc(o.key)}" ${i === 0 ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
      renderValue(root, field?.operators?.[0], '');
    }
    if (e.target.matches('[data-asx-ps-edit-op]')) renderValue(root, opOf(fieldOf(root, root.querySelector('[data-asx-ps-edit-field]').value), e.target.value), '');
  });
  document.addEventListener('keydown', e => {
    const root = e.target.closest('[data-asx-ps-root]');
    if (!root) return;
    const p = read(root);
    if (e.key === 'Escape') { e.preventDefault(); return close(root, true); }
    if (e.target.matches('[data-asx-ps-input]')) {
      if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(root, true); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.target.value.trim() && root.dataset.tree === '1') return e.target.form?.requestSubmit();
        p.menu.hidden ? openMenu(root, true) : menuItems(root)[0]?.click();
      }
      else if (e.key === 'Backspace' && !e.target.value && p.filters.length) { e.preventDefault(); removeAt(root, p.filters.length - 1); }
      else if (e.key === 'ArrowLeft' && !e.target.value) p.tokens.querySelector('[data-asx-ps-token]:last-child')?.focus();
      return;
    }
    if (e.target.matches('[data-asx-ps-field]')) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveMenu(root, 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveMenu(root, -1); }
      else if (e.key === 'Home') { e.preventDefault(); jumpMenu(root, false); }
      else if (e.key === 'End') { e.preventDefault(); jumpMenu(root, true); }
      else if (e.key === 'Enter') { e.preventDefault(); e.target.click(); }
      else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) typeaheadMenu(root, e.key);
      return;
    }
    const token = e.target.closest('[data-asx-ps-token]');
    if (token) {
      const i = Number(token.dataset.asxPsToken);
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditor(root, p.filters[i], String(i)); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); removeAt(root, i); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); (token.nextElementSibling || p.input)?.focus(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); (token.previousElementSibling || p.input)?.focus(); }
      return;
    }
    if (!p.editor.hidden && e.key === 'Enter' && (e.metaKey || e.ctrlKey || e.target.matches('[data-asx-ps-value],[data-asx-ps-value-start],[data-asx-ps-value-end]'))) { e.preventDefault(); applyEditor(root); }
  });
})();
