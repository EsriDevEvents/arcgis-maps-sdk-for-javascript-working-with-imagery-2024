require([
    "esri/Basemap", 
    "esri/layers/VectorTileLayer", 
    "esri/geometry/Point", 
    "esri/layers/ImageryLayer",
    "esri/layers/support/RasterFunction"
], function(Basemap, VectorTileLayer, Point, ImageryLayer, RasterFunction) {
    const arcgisMap = document.querySelector("arcgis-map");

    arcgisMap.addEventListener("arcgisViewReadyChange", () => {
        arcgisMap.goTo({center: new Point({ x: 76870, y: 6777577, spatialReference: { wkid: 25833 } }), zoom: 7});
    });

    arcgisMap.basemap = new Basemap({
        baseLayers: [
            new VectorTileLayer({
                url: "https://services.geodataonline.no/arcgis/rest/services/GeocacheVector/GeocacheNordenGraatone/VectorTileServer",
                title: "Basemap"
            })
        ],
        title: "basemap",
        id: "basemap"
    });

    const url = ""; // There is open elevation data for Norway, visit https://hoydedata.no/ to find the most current elevation service
    const imageryLayer = new ImageryLayer({url, opacity: .5});

    const terrainConfig = {
        elevation: [800, 1800],
        slope: [15, 35],
        aspect: [250, 360]
    }

    arcgisMap.addLayer(imageryLayer);

    document.getElementById("showElevation").addEventListener("click", (evt) => {
        if (evt.target.checked) {
            updateTerrainLayer(terrainConfig);
        }
        else {
            imageryLayer.rasterFunction = null;
        }
    });

    document.getElementById("eleSlider").addEventListener("calciteSliderChange", (evt) => {
        terrainConfig.elevation = [evt.target.minValue, evt.target.maxValue];
        updateTerrainLayer(terrainConfig);
    });
    document.getElementById("slopeSlider").addEventListener("calciteSliderChange", (evt) => {
        terrainConfig.slope = [evt.target.minValue, evt.target.maxValue];
        updateTerrainLayer(terrainConfig);
    });
    document.getElementById("aspectSlider").addEventListener("calciteSliderChange", (evt) => {
        terrainConfig.aspect = [evt.target.minValue, evt.target.maxValue];
        updateTerrainLayer(terrainConfig);
    });
    document.getElementById("opacitySlider").addEventListener("calciteSliderChange", (evt) => {
        imageryLayer.opacity = evt.target.value / 100;
    });

    const updateTerrainLayer = (values) => {
        const rasterFunctions = CreateRasterFunctions(values);
        imageryLayer.rasterFunction = rasterFunctions;
    };

    const CreateRasterFunctions = (values) => {
        // Mask function to filter on selected elevation range
        var filterElevation = new RasterFunction({
            functionName: "Mask",
            functionArguments: {
                includedRanges: [
                    values.elevation[0], values.elevation[1]
                ],
            }
        });
    
        // Remap function to get the selected aspect range
        var filterAspect = new RasterFunction({
            functionName: "Remap",
            functionArguments: {
                inputRanges: [values.aspect[0], values.aspect[1]],
                outputValues: [1],
                noDataRanges: [
                    0, values.aspect[0], values.aspect[1], 360
                ],
                // Create aspect
                raster: new RasterFunction({
                    functionName: "Aspect",
                    functionArguments: {
                        // Apply elevation filter
                        raster: filterElevation
                    }
                })
            }
        });
    
        // Remap function to get the selected slope range
        var filterSlope = new RasterFunction({
            functionName: "Remap",
            functionArguments: {
                inputRanges: [values.slope[0], values.slope[1]],
                outputValues: [1],
                noDataRanges: [
                    0, values.slope[0], values.slope[1], 90
                ],
                // Create slope
                raster: new RasterFunction({
                    functionName: "Slope",
                    functionArguments: {
                        // Get the elevation values back
                        raster: new RasterFunction({
                            functionName: "RasterCalculator",
                            functionArguments: {
                                inputNames: ["r1", "r2"],
                                expression: "r1+r2",
                                rasters: [
                                    "$$",
                                    filterAspect // using aspect function as input
                                ]
                            }
                        })
                    }
                })
            }
        });
    
        // Colormap function to render the result
        var colormap = new RasterFunction({
            functionName: "Colormap",
            functionArguments: {
                colormap: [
                    [1, 255, 0, 0]
                ],
                raster: filterSlope // using slope function as input
            }
        });
    
        return colormap;
    }
  });