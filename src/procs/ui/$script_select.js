// The behaviour of `ui.select` — the parts markup cannot express: opening the
// list, moving through it, picking, and closing.
//
// By delegation on the markers the kit emits (`[data-field][data-select]`
// holding a `[role=listbox]`), so no widget is wired to anything and every htmx
// swap keeps working. Nothing here reads a CSS class to find an element.
//
// The value lives in the hidden input, which is what posts and what
// `page.fill` writes — so this also listens for a `change` on it and re-reads
// the label from the list. Filling the field programmatically and picking with
// the mouse then leave the widget in the same state, which is the only reason
// the two can be trusted to mean the same thing.
const ROOT = "[data-field][data-select]";
const OPTION = "[role=option]";

const rootOf = (node) => (node && node.closest ? node.closest(ROOT) : null);
const listOf = (root) => root.querySelector("[role=listbox]");
const buttonOf = (root) => root.querySelector("[aria-haspopup=listbox]");
const holderOf = (root) => root.querySelector("input[type=hidden]");
const optionsOf = (root) => Array.from(listOf(root).querySelectorAll(OPTION));
const activeOf = (root) => listOf(root).querySelector("[data-active]");
const isOpen = (root) => !listOf(root).classList.contains("hidden");

function open(root) {
    // One at a time: two open lists is a page with two answers to the same
    // question about where you are.
    for (const other of document.querySelectorAll(ROOT)) if (other !== root && isOpen(other)) close(other);
    const list = listOf(root);
    list.classList.remove("hidden");
    // FIXED, at the trigger's own rectangle. The list used to be absolute
    // inside the field — and a field inside `ui.box` (overflow-hidden for its
    // rounded corners) had its list clipped at the card's edge: one visible
    // option and the rest under the border. Fixed positioning escapes every
    // ancestor's overflow; scrolling anywhere closes the list rather than
    // letting it float detached from its field.
    const at = buttonOf(root).getBoundingClientRect();
    list.style.position = "fixed";
    list.style.left = `${at.left}px`;
    list.style.top = `${at.bottom + 4}px`;
    list.style.width = `${at.width}px`;
    buttonOf(root).setAttribute("aria-expanded", "true");
    root.setAttribute("data-open", "");
    const current = optionsOf(root).find(o => o.getAttribute("aria-selected") === "true");
    setActive(root, current ?? optionsOf(root)[0]);
}

function close(root) {
    const list = listOf(root);
    list.classList.add("hidden");
    list.style.position = list.style.left = list.style.top = list.style.width = "";
    buttonOf(root).setAttribute("aria-expanded", "false");
    root.removeAttribute("data-open");
    const was = activeOf(root);
    if (was) was.removeAttribute("data-active");
}

// A fixed list does not travel with its field: any scroll closes it instead.
document.addEventListener("scroll", () => {
    for (const root of document.querySelectorAll(ROOT)) if (isOpen(root)) close(root);
}, { capture: true, passive: true });

function setActive(root, option) {
    const was = activeOf(root);
    if (was) was.removeAttribute("data-active");
    if (!option) return;
    option.setAttribute("data-active", "");
    option.scrollIntoView({ block: "nearest" });
}

function move(root, step) {
    const options = optionsOf(root);
    if (!options.length) return;
    const at = options.indexOf(activeOf(root));
    const next = at < 0 ? (step > 0 ? 0 : options.length - 1) : Math.min(options.length - 1, Math.max(0, at + step));
    setActive(root, options[next]);
}

// Pick one. The label follows the list rather than the click, so a value set
// from anywhere lands the same way.
function choose(root, option) {
    if (!option) return;
    const holder = holderOf(root);
    holder.value = option.getAttribute("data-value") ?? "";
    show(root);
    close(root);
    buttonOf(root).focus();
    holder.dispatchEvent(new Event("input", { bubbles: true }));
    holder.dispatchEvent(new Event("change", { bubbles: true }));
}

// The button says what the hidden input holds — read off the list, so the
// placeholder and its grey are the list's own first row and not a second copy
// of it here.
function show(root) {
    const value = holderOf(root).value ?? "";
    const options = optionsOf(root);
    const chosen = options.find(o => (o.getAttribute("data-value") ?? "") === value) ?? options[0];
    for (const o of options) o.setAttribute("aria-selected", o === chosen ? "true" : "false");
    const label = root.querySelector("[data-role=label]");
    if (!label || !chosen) return;
    label.textContent = chosen.querySelector("span")?.textContent ?? "";
    label.classList.toggle("text-base-content/50", value === "");
}

document.addEventListener("click", event => {
    const root = rootOf(event.target);
    // A press anywhere else closes whatever was open — including inside another
    // widget, which is what makes a page with six of these behave like one.
    if (!root) { for (const other of document.querySelectorAll(ROOT)) close(other); return; }

    const option = event.target.closest(OPTION);
    if (option && listOf(root).contains(option)) return choose(root, option);
    if (event.target.closest("[aria-haspopup=listbox]")) return isOpen(root) ? close(root) : open(root);
});

document.addEventListener("keydown", event => {
    const root = rootOf(event.target);
    if (!root) return;
    const key = event.key;

    if (!isOpen(root)) {
        // Down, up, Enter and space all mean "show me the list" on a closed
        // widget — which is what a native one does, and what a hand expects.
        if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") { event.preventDefault(); open(root); }
        return;
    }
    if (key === "Escape") { event.preventDefault(); close(root); buttonOf(root).focus(); return; }
    if (key === "Enter" || key === " ") { event.preventDefault(); return choose(root, activeOf(root)); }
    if (key === "ArrowDown") { event.preventDefault(); return move(root, 1); }
    if (key === "ArrowUp") { event.preventDefault(); return move(root, -1); }
    if (key === "Home") { event.preventDefault(); return setActive(root, optionsOf(root)[0]); }
    if (key === "End") { event.preventDefault(); const all = optionsOf(root); return setActive(root, all[all.length - 1]); }
    if (key === "Tab") return close(root);

    // Typing jumps, the way it does in every dropdown anybody has used. One
    // letter cycles through the rows starting with it; typing faster than the
    // pause spells a word.
    if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        typed = Date.now() - lastKey < 700 ? typed + key : key;
        lastKey = Date.now();
        const options = optionsOf(root);
        const from = typed.length === 1 ? options.indexOf(activeOf(root)) + 1 : options.indexOf(activeOf(root));
        const ordered = [...options.slice(Math.max(0, from)), ...options.slice(0, Math.max(0, from))];
        const hit = ordered.find(o => (o.textContent ?? "").trim().toLowerCase().startsWith(typed.toLowerCase()));
        if (hit) setActive(root, hit);
    }
});
let typed = "";
let lastKey = 0;

// Somebody else wrote the value — `page.fill`, a form reset, a test. The label
// is stale until it is re-read, and a widget that shows one value and posts
// another is worse than one that cannot be filled at all.
document.addEventListener("change", event => {
    const root = rootOf(event.target);
    if (root && event.target === holderOf(root)) show(root);
}, true);
