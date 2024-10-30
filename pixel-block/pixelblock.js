require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/ImageryTileLayer",
    "esri/layers/FeatureLayer",
    "esri/Graphic",
    "esri/geometry/Circle",
    "esri/layers/support/TileInfo",
    "esri/core/promiseUtils",
    "esri/widgets/Expand"
  ], (Map, MapView, ImageryTileLayer, FeatureLayer, Graphic, Circle, TileInfo, promiseUtils, Expand) =>
    (async () => {

        const arcgisMap = document.querySelector("arcgis-map");

        let landCoverChart, pixelValCount, pixelData;
        let rasterAttributeFeatures = {};

        const lods = TileInfo.create().lods;
        let lastLod = lods[lods.length - 1].clone();
        for (let i = 0; i < 3; i++) {
            lastLod.level++;
            lastLod.resolution /= 2;
            lastLod.scale /= 2;
            lods.push(lastLod);
            lastLod = lastLod.clone();
        }

        arcgisMap.constraints = {
            rotationEnabled: false,
            minScale: 36978595, // U.S.
            // use AGOL lods for the view
            lods
        };

      // initialize the imagery layer with lerc format
      const imageryLayer = new ImageryTileLayer("https://tiledimageservices.arcgis.com/gUR1YWXNyLOlL4Ys/arcgis/rest/services/NLCD2001_Tiled/ImageServer");

      arcgisMap.addLayer(imageryLayer);

      // graphic that will represent one mile buffer as user drags the pointer
      // over the map to view land cover types within one mile of the pointer
      const graphic = new Graphic({
        geometry: null,
        symbol: {
          type: "simple-fill",
          color: null,
          style: "solid",
          outline: {
            color: "blue",
            width: 2
          }
        }
      });

      arcgisMap.whenLayerView(imageryLayer).then(layerLoaded);
      function layerLoaded(layerView) {

        arcgisMap.graphics.add(graphic);

        // watch for the imagery layer view's updating property
        // to get the updated pixel values
        layerView.watch("updating", (value) => {
          pixelData = null;
          if (!value) {
            imageryLayer.fetchPixels(arcgisMap.view.extent, arcgisMap.view.width, arcgisMap.view.height).then((result) => pixelData = result);
          }
        });

        // when the layer loads, listen to the view's drag and click
        // events to update the land cover types chart to reflect an
        // area within 1 mile of the pointer location.
        removeChartEvents = arcgisMap.view.on(["drag", "click"], (event) => {
          if (pixelData) {
            event.stopPropagation();
            getLandCoverPixelInfo(event).then(updateLandCoverChart);
          }
        });
        // raster attributes table returns categorical mapping of pixel values such as class and group
        const attributesData =
          imageryLayer.serviceRasterInfo.attributeTable.features;

        // rasterAttributeFeatures will be used to add legend labels and colors for each
        // land use type
        for (let index in attributesData) {
          if (attributesData) {
            const hexColor = rgbToHex(
              attributesData[index].attributes.Red,
              attributesData[index].attributes.Green,
              attributesData[index].attributes.Blue
            );
            rasterAttributeFeatures[attributesData[index].attributes.Value] =
            {
              ClassName: attributesData[index].attributes.ClassName,
              hexColor: hexColor
            };
          }
        }
        // initialize the land cover pie chart
        createLandCoverChart();
      }

      // This function is called as user drags the pointer over or clicks on the view.
      // Here we figure out which pixels fall within one mile of the
      // pointer location and update the chart accordingly
      const getLandCoverPixelInfo = promiseUtils.debounce((event) => {
        if (!pixelData) {
          return;
        }
        const currentExtent = pixelData.extent;
        const pixelBlock = pixelData.pixelBlock;
        const height = pixelBlock.height;
        const width = pixelBlock.width;

        // map point for the pointer location.
        const point = event.mapPoint ?? arcgisMap.view.toMap({
          x: event.x,
          y: event.y
        });;
        // pointer x, y in pixels
        const reqX = Math.ceil(event.x);
        const reqY = Math.ceil(event.y);

        // calculate how many meters are represented by 1 pixel.
        const pixelSizeX =
          Math.abs(currentExtent.xmax - currentExtent.xmin) / width;

        // calculate how many pixels represent one mile
        const bufferDim = Math.ceil(1609 / pixelSizeX);

        // figure out 2 mile extent around the pointer location
        const xmin = reqX - bufferDim < 0 ? 0 : reqX - bufferDim;
        const ymin = reqY - bufferDim < 0 ? 0 : reqY - bufferDim;
        const startPixel = ymin * width + xmin;
        const bufferlength = bufferDim * 2;
        const pixels = pixelBlock.pixels[0];
        const radius2 = bufferDim * bufferDim;
        let oneMilePixelValues = [];

        // cover pixels within to 2 mile rectangle
        if (bufferlength) {
          for (let i = 0; i <= bufferlength; i++) {
            for (let j = 0; j <= bufferlength; j++) {
              // check if the given pixel location is in within one mile of the pointer
              // add its value to pixelValue.
              if (Math.pow(i - bufferDim, 2) + Math.pow(j - bufferDim, 2) <= radius2) {
                const pixelValue = pixels[Math.floor(startPixel + i * width + j)];
                if (pixelValue != null) {
                  oneMilePixelValues.push(pixelValue);
                }
              }
            }
          }
        } else {
          oneMilePixelValues.push(pixels[startPixel]);
        }
        pixelValCount = {};
        // get the count of each land type returned within one mile raduis
        for (let i = 0; i < oneMilePixelValues.length; i++) {
          pixelValCount[oneMilePixelValues[i]] =
            1 + (pixelValCount[oneMilePixelValues[i]] || 0);
        }
        const circle = new Circle({
          center: point,
          radius: bufferDim * pixelSizeX
        });

        graphic.geometry = circle;
      });

      // This function is called once pixel values within one mile of the pointer
      // location are processed and ready for the chart update.
      function updateLandCoverChart() {
        landCoverChart.data.datasets[0].data = [];
        let dataset = [];
        let landCoverTypeColors = [];
        let landCoverTypeLabels = [];

        // pixelValCount object contains land cover types and count of pixels
        // that represent that type in within one mile.
        for (let index in pixelValCount) {
          if (index == 0) {
            landCoverTypeColors.push("rgba(255,255,255,1");
            landCoverTypeLabels.push("NoData");
          } else {
            const color = rasterAttributeFeatures[index].hexColor;
            landCoverTypeColors.push(color);
            landCoverTypeLabels.push(
              rasterAttributeFeatures[index].ClassName
            );
          }
          landCoverChart.data.datasets[0].data.push(pixelValCount[index]);
        }
        landCoverChart.data.datasets[0].backgroundColor = landCoverTypeColors;
        landCoverChart.data.labels = landCoverTypeLabels;
        landCoverChart.update(0);
        document.getElementById("chartLegend").innerHTML = landCoverChart.generateLegend();
      }

      // This function is called when the ImageryLayer is loaded.
      // It sets up the land cover types chart.
      function createLandCoverChart() {
        const landCoverCanvas = document.getElementById("landcover-chart");
        landCoverChart = new Chart(landCoverCanvas.getContext("2d"), {
          type: "doughnut",
          data: {
            labels: [],
            datasets: [
              {
                data: [],
                backgroundColor: [],
                borderColor: "rgb(0, 0, 0, 0, 1)",
                borderWidth: 0.5
              }
            ]
          },
          options: {
            responsive: false,
            cutoutPercentage: 35,
            legend: {
              display: false
            },
            title: {
              display: true,
              text: ""
            },
            plugins: {
              datalabels: {
                formatter: (value, ctx) => {
                  let datasets = ctx.chart.data.datasets;
                  if (datasets.indexOf(ctx.dataset) === datasets.length - 1) {
                    let sum = datasets[0].data.reduce((a, b) => {
                      return a + b;
                    });
                    let percentage = Math.round((value / sum) * 100);
                    if (percentage > 15) {
                      return percentage + "%";
                    } else {
                      return "";
                    }
                  } else {
                    return percentage;
                  }
                },
                color: "#4c4c4c"
              }
            }
          }
        });
      }

      function componentToHex(c) {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
      }

      function rgbToHex(r, g, b) {
        return (
          "#" + componentToHex(r) + componentToHex(g) + componentToHex(b)
        );
      }
    })());