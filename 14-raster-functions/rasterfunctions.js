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

    const url = ""; // There is open elevation data for Norway, go to https://hoydedata.no/ to find the most current elevation service
    const imageryLayer = new ImageryLayer(url);

    const terrainConfig = {
        elevation: [800, 1800],
        slope: [15, 35],
        aspect: [210, 360]
    }

    arcgisMap.addLayer(imageryLayer);

    document.getElementById("showElevation").addEventListener("click", (evt) => {
        if (evt.target.checked) {
            updateTerrainLayer(terrainConfig);
        }
        else {
            imageryLayer.renderingRule = null;
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
        imageryLayer.renderingRule = rasterFunctions;
    };

    const CreateRasterFunctions = (values) => {
        // Create the aspect values
        let noDataRanges = [];
        let inputRanges = values.aspect;
    
        values.aspect.forEach((value, i) => {
            if (i == 0 && value > 0) {
                noDataRanges.push(0, value);
            } else if (!(i & 1) && i > 0) {
                // Even but not first
                noDataRanges.push(inputRanges[i - 1], inputRanges[i]);
            } else if (i == (inputRanges.length - 1) && value < 360) {
                // Fill last gap
                noDataRanges.push(value, 360);
            }
        });
            
        var filterElevation = new RasterFunction({
            functionName: "Mask",
            functionArguments: {
                includedRanges: [
                    values.elevation[0], values.elevation[1]
                ],
            }
        });
    
        var filterAspect = new RasterFunction({
            functionName: "Remap",
            functionArguments: {
                inputRanges: inputRanges,
                outputValues: [1],
                noDataRanges: noDataRanges,
                // Create aspect
                raster: new RasterFunction({
                    functionName: "Aspect",
                    functionArguments: {
                        // apply elevation filter
                        raster: filterElevation
                    }
                })
            }
        });
    
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
                                    filterAspect
                                ]
                            }
                        })
                    }
                })
            }
        });
    
        var colormap = new RasterFunction({
            functionName: "Colormap",
            functionArguments: {
                colormap: [
                    [1, 255, 0, 0]
                ],
                raster: filterSlope
            }
        });
    
        return colormap;
    }
  });