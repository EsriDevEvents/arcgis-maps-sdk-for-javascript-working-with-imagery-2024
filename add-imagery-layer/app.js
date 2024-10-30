const navigationEl = document.getElementById("nav");
const panelEl = document.getElementById("sheet-panel");
const sheetEl = document.getElementById("sheet");
const mapElem = document.querySelector("arcgis-map");

navigationEl.addEventListener("calciteNavigationActionSelect", () => handleSheetOpen());

panelEl.addEventListener("calcitePanelClose", () => handlePanelClose());

mapElem.addEventListener("arcgisViewReadyChange", () => handleViewReady());

function handleSheetOpen() {
  sheetEl.open = true;
  panelEl.closed = false;
}

function handlePanelClose() {
  sheetEl.open = false;
}

async function handleViewReady(event) {
  const ImageryLayer = await $arcgis.import("esri/layers/ImageryLayer");
  const landCoverLayer = new ImageryLayer({
    url: "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer"
  });
  mapElem.addLayer(landCoverLayer);
}
