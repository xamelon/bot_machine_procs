(() => {
  if (window.__asxMedia) return;
  window.__asxMedia = true;
  document.addEventListener('click', e => {
    const next = e.target.closest('[data-asx-carousel-next]');
    const prev = e.target.closest('[data-asx-carousel-prev]');
    if (next || prev) {
      const root = e.target.closest('[data-asx-carousel]');
      const track = root.querySelector('[data-asx-carousel-track]');
      track.scrollBy({left: (next ? 1 : -1) * track.clientWidth * .9, behavior: 'smooth'});
      return;
    }
    const lb = e.target.closest('[data-asx-lightbox]');
    if (lb) {
      const overlay = document.createElement('div');
      overlay.className = 'asx-lightbox-overlay';
      overlay.innerHTML = '<button type="button" aria-label="Close">×</button><img src="' + lb.dataset.src.replace(/"/g, '&quot;') + '" alt="' + (lb.dataset.alt || '').replace(/"/g, '&quot;') + '">';
      document.body.appendChild(overlay);
    }
    const close = e.target.closest('.asx-lightbox-overlay button, .asx-lightbox-overlay');
    if (close && e.target === close) close.closest('.asx-lightbox-overlay')?.remove();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelector('.asx-lightbox-overlay')?.remove();
  });
})();
