// Phones: the sidebar is a drawer opened from the top bar (see layout.ts and
// the ≤800px block in agent.css). On wider screens none of this is visible.
(() => {
    if (window.__botDrawer) return;
    window.__botDrawer = true;
    const root = () => document.querySelector('.bot-workbench');
    const set = (open) => {
        const r = root();
        if (!r) return;
        r.dataset.navOpen = String(open);
        r.querySelector('[data-nav-toggle]')?.setAttribute('aria-expanded', String(open));
    };
    // The bar names the section that is open: the item nav.js marked active.
    const label = (text) => {
        const current = document.querySelector('[data-nav-current]');
        const active = text ?? document.querySelector('.asx-nav-item[data-active="true"]')?.textContent?.trim();
        if (current && active) current.textContent = active;
    };
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-nav-toggle]')) return set(root()?.dataset.navOpen !== 'true');
        if (e.target.closest('[data-nav-close]')) return set(false);
        const item = e.target.closest('.bot-workbench .asx-side-nav a[href]');
        if (item) { label(item.textContent.trim()); set(false); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    window.addEventListener('popstate', () => setTimeout(() => label(), 0));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => label());
    else label();
})();
