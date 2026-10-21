(() => {
  if (window.__asxBottomSheet) return;
  window.__asxBottomSheet = true;
  document.addEventListener('click', e => {
    const open = e.target.closest('[data-asx-sheet-open]');
    if (open) document.getElementById(open.dataset.asxSheetOpen).hidden = false;
    if (e.target.closest('[data-asx-sheet-close]')) e.target.closest('[data-asx-sheet]').hidden = true;
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('[data-asx-sheet]').forEach(x => x.hidden = true);
  });
})();
