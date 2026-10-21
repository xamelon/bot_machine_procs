(() => {
  if (window.__asxDialog) return;
  window.__asxDialog = true;
  let lastFocus = null;
  const focusable = root => [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
  const open = dialog => {
    lastFocus = document.activeElement;
    dialog.showModal();
    requestAnimationFrame(() => (focusable(dialog)[0] || dialog).focus());
  };
  const close = dialog => {
    dialog.close();
    if (lastFocus?.isConnected) lastFocus.focus();
  };
  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-asx-dialog-open]');
    if (opener) return open(document.getElementById(opener.dataset.asxDialogOpen));
    const closer = e.target.closest('[data-asx-dialog-close]');
    if (closer) return close(closer.closest('dialog'));
    if (e.target.matches('dialog.asx-dialog') && e.target.dataset.purpose === 'info') close(e.target);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const dialog = document.querySelector('dialog.asx-dialog[open]');
    if (!dialog) return;
    if (dialog.dataset.purpose === 'required') e.preventDefault();
    else { e.preventDefault(); close(dialog); }
  });
  document.addEventListener('cancel', e => {
    if (e.target?.dataset?.purpose === 'required') e.preventDefault();
  });
  document.addEventListener('close', e => {
    if (e.target.matches?.('dialog.asx-dialog') && lastFocus?.isConnected) lastFocus.focus();
  });
})();
