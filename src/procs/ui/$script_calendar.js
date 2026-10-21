(() => {
  if (window.__asxCalendar) return;
  window.__asxCalendar = true;
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const render = root => {
    const [y, m] = root.dataset.month.split('-').map(Number);
    const value = root.dataset.value;
    const first = new Date(y, m - 1, 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    root.querySelector('[data-asx-cal-title]').textContent = first.toLocaleDateString(undefined, {month: 'long', year: 'numeric'});
    const grid = root.querySelector('[data-asx-cal-grid]');
    grid.innerHTML = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const v = iso(d);
      const btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = d.getDate(); btn.dataset.date = v;
      btn.dataset.outside = String(d.getMonth() !== m - 1);
      btn.dataset.selected = String(v === value);
      grid.appendChild(btn);
    }
  };
  document.addEventListener('click', e => {
    const root = e.target.closest('[data-asx-calendar]');
    if (!root) return;
    const [y, m] = root.dataset.month.split('-').map(Number);
    if (e.target.closest('[data-asx-cal-prev]')) root.dataset.month = `${m === 1 ? y - 1 : y}-${pad(m === 1 ? 12 : m - 1)}`;
    else if (e.target.closest('[data-asx-cal-next]')) root.dataset.month = `${m === 12 ? y + 1 : y}-${pad(m === 12 ? 1 : m + 1)}`;
    else if (e.target.matches('[data-date]')) {
      root.dataset.value = e.target.dataset.date;
      root.querySelector('[data-asx-cal-hidden]')?.setAttribute('value', e.target.dataset.date);
      root.dataset.month = e.target.dataset.date.slice(0, 7);
    } else return;
    render(root);
  });
  document.querySelectorAll('[data-asx-calendar]').forEach(render);
})();
