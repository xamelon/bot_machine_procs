(() => {
  if (window.__asxInputBits) return;
  window.__asxInputBits = true;
  document.addEventListener('input', e => {
    const slider = e.target.closest('[data-asx-slider]');
    if (slider) slider.querySelector('[data-asx-slider-value]').textContent = e.target.value;
    const file = e.target.closest('[data-asx-file]');
    if (file) {
      const files = [...e.target.files].map(f => f.name);
      file.querySelector('[data-asx-file-label]').textContent = files.length ? files.join(', ') : file.dataset.mode === 'dropzone' ? 'Drop files here or choose files' : e.target.multiple ? 'Choose files' : 'Choose file';
    }
  });
  const zone = e => {
    const root = e.target.closest?.('[data-asx-file][data-mode="dropzone"]');
    return root && !root.querySelector('input[type="file"]').disabled ? root : null;
  };
  document.addEventListener('dragover', e => {
    const root = zone(e);
    if (!root || ![...(e.dataTransfer?.types || [])].includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    root.dataset.dragging = 'true';
  });
  document.addEventListener('dragleave', e => {
    const root = zone(e);
    if (root && !root.contains(e.relatedTarget)) delete root.dataset.dragging;
  });
  document.addEventListener('drop', e => {
    const root = zone(e);
    if (!root) return;
    e.preventDefault();
    delete root.dataset.dragging;
    const files = [...(e.dataTransfer?.files || [])];
    if (!files.length) return;
    const input = root.querySelector('input[type="file"]');
    const transfer = new DataTransfer();
    for (const file of input.multiple ? files : files.slice(0, 1)) transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-asx-step]');
    if (!btn) return;
    const root = btn.closest('[data-asx-number-stepper]');
    const input = root.querySelector('input');
    const step = Number(input.step || 1) * Number(btn.dataset.asxStep);
    input.value = String(Math.min(Number(input.max || Infinity), Math.max(Number(input.min || -Infinity), Number(input.value || 0) + step)));
    input.dispatchEvent(new Event('input', {bubbles: true}));
  });
})();
