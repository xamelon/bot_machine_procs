// A form whose Save is dead until something is worth saving.
//
// A settings card is mostly a page you are looking at, not filling in — and a
// live Save on a page nobody has touched is an invitation to press it and find
// out what it did. The button starts disabled and comes to life on the first
// value that differs from what was rendered.
//
// "What was rendered" is the browser's own `defaultValue` / `defaultChecked`,
// so nothing has to be snapshotted and nothing can drift: it IS the HTML the
// server sent. Marked with `data-guard="dirty"` on the form; only the submit
// that means Save is governed (`data-action="save"`), because a Remove beside
// it is a different act and is not waiting for an edit.
(() => {
  const dirty = (form) => [...form.elements].some((el) => {
    if (!el.name || el.disabled) return false;
    if (el.type === "checkbox" || el.type === "radio") return el.checked !== el.defaultChecked;
    if (el.tagName === "SELECT") return [...el.options].some(o => o.selected !== o.defaultSelected);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return el.value !== el.defaultValue;
    return false;
  });

  const sync = (form) => {
    const save = form.querySelector('[data-action="save"]');
    if (save) save.disabled = !dirty(form);
  };

  const wire = (root) => {
    for (const form of (root.matches?.('[data-guard="dirty"]') ? [root] : root.querySelectorAll?.('[data-guard="dirty"]') ?? [])) sync(form);
  };

  for (const ev of ["input", "change"]) {
    document.addEventListener(ev, (e) => {
      const form = e.target?.closest?.('[data-guard="dirty"]');
      if (form) sync(form);
    });
  }
  // On the first paint and after every swap: a card that comes back from the
  // server comes back clean.
  document.addEventListener("DOMContentLoaded", () => wire(document));
  document.addEventListener("htmx:load", (e) => wire(e.target));
  document.addEventListener("htmx:afterSwap", (e) => wire(e.target));
  wire(document);
})();
