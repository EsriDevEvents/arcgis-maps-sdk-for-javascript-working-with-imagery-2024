const navigationEl = document.getElementById("nav");
const panelEl = document.getElementById("sheet-panel");
const sheetEl = document.getElementById("sheet");
const mapElem = document.querySelector("arcgis-map");
const bandIdsSelect = document.getElementById("bandIdsSelect");

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
  const ImageryTileLayer = await $arcgis.import("esri/layers/ImageryTileLayer");
  const RasterStretchRenderer = await $arcgis.import("esri/renderers/RasterStretchRenderer");
  const renderer = new RasterStretchRenderer();
  renderer.type = "raster-stretch";
  renderer.stretchType = "standard-deviation";

  const berlinLayer = new ImageryTileLayer({
    url: "../data/berlin.tif",
    bandIds: [2,1,0],
    renderer
  });
  mapElem.addLayer(berlinLayer);

  bandIdsSelect.addEventListener("change", () => {
    const bands = bandIdsSelect.value.split(",").map(Number);
    berlinLayer.bandIds = bands;
  });
}
