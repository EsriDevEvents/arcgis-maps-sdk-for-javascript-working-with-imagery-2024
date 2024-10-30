const navigationEl = document.getElementById("nav");
const panelEl = document.getElementById("sheet-panel");
const sheetEl = document.getElementById("sheet");

navigationEl.addEventListener("calciteNavigationActionSelect", () => handleSheetOpen());

panelEl.addEventListener("calcitePanelClose", () => handlePanelClose());

function handleSheetOpen() {
  sheetEl.open = true;
  panelEl.closed = false;
}

function handlePanelClose() {
  sheetEl.open = false;
}