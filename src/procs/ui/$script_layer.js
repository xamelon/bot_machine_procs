(() => {
  if (window.__asxLayer) return;
  window.__asxLayer = true;
  let lastFocus = null;
  let typeahead = '';
  let typeaheadTimer = 0;

  const isOpen = el => el && !el.hidden;
  const focusable = root => [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null || x.matches('dialog *'));
  const closePanel = (panel, restore = true) => {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    const root = panel.closest('[data-asx-menu-root],[data-asx-popover-root],[data-asx-context-root],[data-asx-sheet]');
    root?.querySelector('[aria-expanded="true"]')?.setAttribute('aria-expanded', 'false');
    if (restore && lastFocus?.isConnected) lastFocus.focus();
  };
  const closeAll = (except = null, restore = false) => {
    document.querySelectorAll('[data-asx-menu-panel],[data-asx-popover-panel],[data-asx-context-panel]').forEach(p => {
      if (!except || !p.closest(except)) closePanel(p, restore);
    });
    document.querySelectorAll('[data-asx-sheet]').forEach(s => { if (!except || !s.matches(except)) s.hidden = true; });
  };
  const openPanel = (panel, trigger, focus = false) => {
    lastFocus = document.activeElement;
    closeAll(null, false);
    panel.hidden = false;
    trigger?.setAttribute('aria-expanded', 'true');
    if (focus) requestAnimationFrame(() => (focusable(panel)[0] || panel).focus());
  };
  const menuItems = panel => [...panel.querySelectorAll('[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]')].filter(x => !x.disabled && x.getAttribute('aria-disabled') !== 'true');
  const moveMenu = (panel, delta) => {
    const items = menuItems(panel);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    items[(i + delta + items.length) % items.length].focus();
  };
  const typeMenu = (panel, key) => {
    clearTimeout(typeaheadTimer);
    typeahead += key.toLowerCase();
    typeaheadTimer = setTimeout(() => typeahead = '', 650);
    const hit = menuItems(panel).find(x => x.textContent.trim().toLowerCase().startsWith(typeahead));
    hit?.focus();
  };

  document.addEventListener('click', e => {
    const menuRoot = e.target.closest('[data-asx-menu-root]');
    const menuTrigger = e.target.closest('[data-asx-menu-trigger]');
    if (menuRoot && menuTrigger) {
      const panel = menuRoot.querySelector('[data-asx-menu-panel]');
      isOpen(panel) ? closePanel(panel, true) : openPanel(panel, menuTrigger, false);
      return;
    }
    const popRoot = e.target.closest('[data-asx-popover-root]');
    const popTrigger = e.target.closest('[data-asx-popover-trigger]');
    if (popRoot && popTrigger) {
      const panel = popRoot.querySelector('[data-asx-popover-panel]');
      isOpen(panel) ? closePanel(panel, true) : openPanel(panel, popTrigger, false);
      return;
    }
    const sheetOpen = e.target.closest('[data-asx-sheet-open]');
    if (sheetOpen) {
      lastFocus = document.activeElement;
      closeAll(null, false);
      document.getElementById(sheetOpen.dataset.asxSheetOpen).hidden = false;
      return;
    }
    const sheetClose = e.target.closest('[data-asx-sheet-close]');
    if (sheetClose) {
      sheetClose.closest('[data-asx-sheet]').hidden = true;
      if (lastFocus?.isConnected) lastFocus.focus();
      return;
    }
    const picked = e.target.closest('[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]');
    if (picked) {
      if (picked.getAttribute('role') === 'menuitemcheckbox') picked.setAttribute('aria-checked', String(picked.getAttribute('aria-checked') !== 'true'));
      if (picked.getAttribute('role') === 'menuitemradio') {
        picked.closest('[role="menu"]')?.querySelectorAll(`[role="menuitemradio"][data-name="${picked.dataset.name || ''}"]`).forEach(x => x.setAttribute('aria-checked', 'false'));
        picked.setAttribute('aria-checked', 'true');
      }
      if (!picked.closest('.asx-dropdown-menu__submenu')) closeAll(null, true);
    }
    if (!e.target.closest('[data-asx-menu-root],[data-asx-popover-root],[data-asx-context-panel]')) closeAll(null, false);
  });

  document.addEventListener('contextmenu', e => {
    const area = e.target.closest('[data-asx-context-area]');
    if (!area) return;
    e.preventDefault();
    const root = area.closest('[data-asx-context-root]');
    const panel = root.querySelector('[data-asx-context-panel]');
    lastFocus = document.activeElement;
    closeAll(null, false);
    panel.hidden = false;
    const rect = root.getBoundingClientRect();
    panel.style.left = Math.max(0, Math.min(e.clientX - rect.left, rect.width - 190)) + 'px';
    panel.style.top = Math.max(0, e.clientY - rect.top) + 'px';
    requestAnimationFrame(() => (menuItems(panel)[0] || panel).focus());
  });

  document.addEventListener('keydown', e => {
    const trigger = e.target.closest('[data-asx-menu-trigger]');
    if (trigger && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const root = trigger.closest('[data-asx-menu-root]');
      const panel = root.querySelector('[data-asx-menu-panel]');
      if (panel.hidden) openPanel(panel, trigger, false);
      const items = menuItems(panel);
      requestAnimationFrame(() => (e.key === 'ArrowUp' ? items.at(-1) : items[0])?.focus());
      return;
    }
    const popTrigger = e.target.closest('[data-asx-popover-trigger]');
    if (popTrigger && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const root = popTrigger.closest('[data-asx-popover-root]');
      const panel = root.querySelector('[data-asx-popover-panel]');
      panel.hidden ? openPanel(panel, popTrigger, false) : closePanel(panel, true);
      return;
    }
    const panel = e.target.closest('[data-asx-menu-panel],[data-asx-context-panel]');
    if (e.key === 'Escape') {
      e.preventDefault();
      const inSub = e.target.closest('.asx-dropdown-menu__subpanel');
      if (inSub) { inSub.parentElement.querySelector(':scope > [role="menuitem"]')?.focus(); return; }
      closeAll(null, true); return;
    }
    if (!panel) return;
    const sub = e.target.closest('.asx-dropdown-menu__submenu');
    if (e.key === 'ArrowRight' && sub) { e.preventDefault(); sub.querySelector('.asx-dropdown-menu__subpanel [role="menuitem"]')?.focus(); return; }
    if (e.key === 'ArrowLeft' && e.target.closest('.asx-dropdown-menu__subpanel')) { e.preventDefault(); e.target.closest('.asx-dropdown-menu__submenu')?.querySelector(':scope > [role="menuitem"]')?.focus(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveMenu(panel, 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveMenu(panel, -1); }
    else if (e.key === 'Home') { e.preventDefault(); menuItems(panel)[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); menuItems(panel).at(-1)?.focus(); }
    else if (e.key === 'Tab') closeAll(null, false);
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) typeMenu(panel, e.key);
  });
})();
