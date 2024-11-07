/** Calcite demo application boilerplate functionality - not related to demo content */
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
  const ImageryTileLayer = await $arcgis.import("esri/layers/ImageryTileLayer");
  const GroupLayer = await $arcgis.import("esri/layers/GroupLayer");
  const TileLayer = await $arcgis.import("esri/layers/TileLayer");
  const RasterStretchRenderer = await $arcgis.import("esri/renderers/RasterStretchRenderer");
  const layer = new ImageryTileLayer({
    url: "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
    title: "World terrain",
    blendMode: "destination-in"
  });
  await layer.load();
  layer.renderer = {
    type: "raster-stretch",
    stretchType: "min-max",
    statistics: [[120, 3068, 400, 700]],
    numberOfStandardDeviations: 1,
    colorRamp: {
      type: "algorithmic",
      fromColor: [0, 0, 0, 0],
      toColor: [0, 0, 0, 1]
    }
  };

  const groupLayer = new GroupLayer({
    title: "Group Layer",
    layers: [
      new TileLayer({
        url: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer",
        listMode: "hide-children",
      }),
      layer,
    ],
  });
  mapElem.addLayer(groupLayer);

  const blendModeSelect = document.getElementById("blendModeSelect");
  blendModeSelect.addEventListener("calciteSelectChange", () => {
    const blendMode = blendModeSelect.value;
    layer.blendMode = blendMode;
  });
}
