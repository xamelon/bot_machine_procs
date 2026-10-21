(() => {
  if (window.__asxInputBits) return;
  window.__asxInputBits = true;
  document.addEventListener('input', e => {
    const slider = e.target.closest('[data-asx-slider]');
    if (slider) slider.querySelector('[data-asx-slider-value]').textContent = e.target.value;
    const file = e.target.closest('[data-asx-file]');
    if (file) {
      const files = [...e.target.files].map(f => f.name);
      file.querySelector('[data-asx-file-label]').textContent = files.length ? files.join(', ') : 'Choose file';
    }
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
