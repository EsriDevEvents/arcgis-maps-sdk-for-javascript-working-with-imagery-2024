require([
    "esri/layers/support/RasterFunction",
    "esri/layers/support/DimensionalDefinition",
    "esri/layers/ImageryTileLayer",
    "esri/widgets/Slider"
  ], (RasterFunction, DimensionalDefinition, ImageryTileLayer, Slider) =>
    (async () => {

        const arcgisMap = document.querySelector("arcgis-map");

        function createMask(range = [29.9, 35.5]) {
            return new RasterFunction({
              functionName: "Mask",
              functionArguments: {
                includedRanges: [...range]
              }
            });
        }

        const url = "https://tiledimageservices.arcgis.com/gUR1YWXNyLOlL4Ys/arcgis/rest/services/HYCOM20130317/ImageServer";
        const layer = new ImageryTileLayer({
            url,
            multidimensionalDefinition: [
                new DimensionalDefinition({ variableName: "salinity", dimensionName: "StdTime", values: [1363478400000] }),
                new DimensionalDefinition({ variableName: "salinity", dimensionName: "StdZ", values: [0] }),
            ],
            rasterFunction: createMask()
        });

        arcgisMap.addLayer(layer);

        function updateRange() {
            layer.rasterFunction = createMask([...slider.values]);
        }

        const slider = new Slider({
            container: "stretch-slider",
            min: 29.9,
            max: 35.5,
            values: [29.9, 35.5],
            steps: 0.1,
            snapOnClickEnabled: false,
            visibleElements: {
                labels: true,
                rangeLabels: true
            }
        });
        slider.on(["thumb-change", "thumb-drag"], updateRange);
        
    })());