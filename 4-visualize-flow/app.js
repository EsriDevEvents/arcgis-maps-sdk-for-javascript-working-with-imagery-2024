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
  const FlowRenderer = await $arcgis.import("esri/renderers/FlowRenderer");
  const layer = new ImageryTileLayer({
    url: "https://tiledimageservices.arcgis.com/LeHsdRPbeEIElrVR/arcgis/rest/services/uvmagdir/ImageServer",
    title: "Currents",
    renderer: new FlowRenderer({
      type: "flow", // autocasts to new FlowRenderer
      trailWidth: "2px",
      density: 1,
      visualVariables: [
        {
          type: "color",
          field: "Magnitude",
          stops: [
            { color: [40, 146, 199, 1], value: 0 },
            { color: [160, 194, 155, 1], value: 5 },
            { color: [218, 230, 119, 1], value: 10 },
          ],
        },
      ],
    }),
    effect: "bloom(1.5, 0.5px, 0)",
  });
  mapElem.addLayer(layer);

  const sliderProps = ["trailWidth", "density", "maxPathLength", "flowSpeed", "trailLength"];
  sliderProps.forEach((prop) => {
    document.getElementById(prop).addEventListener("calciteSliderChange", updateRenderer);
  });

  document.getElementById("flowRepresentation").addEventListener("calciteSegmentedControlChange", updateRenderer);
  document.getElementById("trailCap").addEventListener("calciteSegmentedControlChange", updateRenderer);
  document.getElementById("effectsEnabled").addEventListener("calciteCheckboxChange", updateEffect);

  function updateEffect(event) {
    let checkbox = event.target.checked ? "bloom(1.5, 0.5px, 0)" : null;
    layer.effect = checkbox;
  }

  function updateRenderer(event) {
    let propName = event.target.id;
    let propValue = event.target.value;

    if (propName && propValue != null) {
      let tempRenderer = layer.renderer.clone();

      tempRenderer[propName] = propValue;
      layer.renderer = tempRenderer;
    }
  }
}
