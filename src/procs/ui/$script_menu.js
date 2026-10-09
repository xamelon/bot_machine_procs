// Closing `ui.menu`. The opening is the browser's — the kit draws a <details>,
// so a click on the summary is all it takes and no script is needed for that.
// What a <details> does NOT do is close when you press somewhere else, and a
// dropdown left hanging over the page after the pointer has moved on is read as
// a stuck page.
//
// Three ways out, which is what every menu anybody has used offers: a press
// outside it, Escape, and picking something. The last one used to be assumed —
// an item navigates, the pane swaps, the menu is gone with it — and that is
// true only while the item posts somewhere. An item that swaps a fragment
// leaves the menu exactly where it was.
//
// Delegation on the marker `ui.menu` emits, so nothing is wired per menu and it
// survives every htmx swap.
const MENU = "details[data-entity=menu]";

function closeAll(except) {
    for (const menu of document.querySelectorAll(MENU)) if (menu !== except) menu.open = false;
}

document.addEventListener("click", event => {
    const menu = event.target.closest ? event.target.closest(MENU) : null;
    // Outside every menu: put them all away.
    if (!menu) return closeAll();
    // Inside one: that one stays (the summary is about to toggle it), the rest go.
    closeAll(menu);
    // …unless what was pressed inside it was an item, which is a choice made.
    if (event.target.closest("[role=menuitem]")) menu.open = false;
});

document.addEventListener("keydown", event => { if (event.key === "Escape") closeAll(); });
