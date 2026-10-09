// The browser half of `ui.toast`. A toast is rendered wherever the fragment
// put it; on `hyper-load` it is lifted into the one fixed stack at the bottom
// right (made on first use), shown for `ms`, then taken away — or sooner, when
// its × is pressed. Nothing here reads state off the page: the fragment says
// how long, the element carries its own timer.
(() => {
    if (window.toast) return;
    const stack = () => {
        let el = document.getElementById("ui-toasts");
        if (!el) {
            el = document.createElement("div");
            el.id = "ui-toasts";
            el.className = "ui-toasts";
            document.body.appendChild(el);
        }
        return el;
    };
    window.toast = {
        show(el, ms) {
            stack().appendChild(el);
            clearTimeout(el._toast);
            el._toast = setTimeout(() => window.toast.hide(el), ms);
        },
        hide(el) {
            if (!el || el.classList.contains("ui-toast--leaving")) return;
            clearTimeout(el._toast);
            el.classList.add("ui-toast--leaving");
            setTimeout(() => el.remove(), 250);
        },
    };
})();
