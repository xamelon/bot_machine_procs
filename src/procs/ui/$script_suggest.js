// The browser half of `ui.suggest`: press and hold. A pill held for a beat
// fills from the left — the hint that it can be held at all — and at the end
// of the fill its words are handed up as a `suggest-hold` event, for the box
// on the page to take; the click that would have sent them is swallowed.
// Let go early and nothing has happened: the fill drains and the click sends.
(() => {
  if (window.suggest) return;
  const HOLD = 400;
  let timer = 0, held = null;
  const chip = (e) => e.target?.closest?.('[data-action="suggest"]');
  const start = (el) => {
    held = null;
    el.classList.add("is-holding");
    clearTimeout(timer);
    timer = setTimeout(() => {
      held = el;
      el.classList.remove("is-holding");
      el.classList.add("is-taken");
      setTimeout(() => el.classList.remove("is-taken"), 500);
      el.dispatchEvent(new CustomEvent("suggest-hold", { bubbles: true, detail: { text: el.dataset.text ?? el.textContent.trim() } }));
    }, HOLD);
  };
  const stop = () => {
    clearTimeout(timer);
    for (const el of document.querySelectorAll('[data-action="suggest"].is-holding')) el.classList.remove("is-holding");
  };
  document.addEventListener("pointerdown", (e) => { const el = chip(e); if (el && e.button === 0) start(el); });
  document.addEventListener("pointerup", stop);
  document.addEventListener("pointercancel", stop);
  document.addEventListener("pointerleave", (e) => { if (chip(e)) stop(); }, true);
  document.addEventListener("keydown", (e) => { const el = chip(e); if (el && e.key === " " && !e.repeat) start(el); });
  document.addEventListener("keyup", (e) => { if (chip(e) && e.key === " ") stop(); });
  // The send would follow the hold — this is the one click the pill must not
  // make. Capture, first in line, so nothing further down hears it.
  document.addEventListener("click", (e) => {
    const el = chip(e);
    if (!el || held !== el) return;
    held = null;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
  window.suggest = { HOLD };
})();
