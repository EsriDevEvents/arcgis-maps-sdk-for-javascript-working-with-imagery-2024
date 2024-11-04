require([
    "esri/layers/ImageryTileLayer"
  ], (ImageryTileLayer) =>
    (async () => {

        const arcgisMap = document.querySelector("arcgis-map");

        

      let windRoseChart;

      // create a new instance of an imagery tile layer and apply
      // VectorFieldRenderer to show the speed and direction of wind
      const layer = new ImageryTileLayer({
        url: "https://tiledimageservices.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/NLDAS2011_daily_wind_magdir/ImageServer",
        title: "2011 wind - 10 meters above surface",
        renderer: {
          type: "vector-field",
          style: "beaufort-m", // Beaufort point symbol (meters)
          flowRepresentation: "flow-to",
          symbolTileSize: 30,
          visualVariables: [
            {
              type: "size",
              field: "Magnitude", // values read from the first band
              maxDataValue: 32,
              maxSize: "60px",
              minDataValue: 0.04,
              minSize: "20px"
            },
            {
              type: "rotation",
              field: "Direction", // values read from the second band
              rotationType: "geographic" // "arithmetic" is the default
            }
          ]
        }
      });

      arcgisMap.addLayer(layer);

      arcgisMap.whenLayerView(layer).then(() => {
        // get all the time dimension values from the service and create an array of dates
        const windEpochDates = layer.serviceRasterInfo.multidimensionalInfo.variables[0].dimensions[0].values;
        const windDates = windEpochDates.map(item => new Date(item));

        const timeSlider = document.querySelector("arcgis-time-slider");
        // time slider widget initialization
        // users can visualize daily wind information for all the time dimension available
        timeSlider.mode = "instant";
        timeSlider.fullTimeExtent = {
            start: new Date(windDates[0]), // Jan 1, 2011,
            end: new Date(windDates[windDates.length - 1]) // Dec 31, 2011
        };
        // set the stops to match the dates coming from time dimension
        timeSlider.stops = { dates: windDates };
      });


      // Get wind direction and speed info for all the time dimension values available from this
      // transposed multidimensional service - identify will return 365 values for the each day of 2011
      arcgisMap.addEventListener("arcgisViewClick", (event) => getWindSamples(event));
      async function getWindSamples(clickEvent) {
        const currentLocation = arcgisMap.view.toMap(clickEvent.detail.screenPoint);
        if (layer.serviceRasterInfo.hasMultidimensionalTranspose) {
          // set the transposedVariableName for the identify method. Identify method will return
          // values for all the slices since multidimensionalDefinition is not defined
          const results = await layer.identify(currentLocation, {
            transposedVariableName: "wind_magdir"
          });
          if (!results.dataSeries) {
            return;
          }

          // first number of the magdirValue array is the wind magnitude
          // second number of the magdirValue array is the direction the wind blew from.
          const pixelValues = results.dataSeries.map(({ magdirValue }) => magdirValue);

          drawWindrose(pixelValues);
          
          document.getElementById("instructionsDiv").style.display = "none";
        }
      }

      function drawWindrose(pixelValues) {
        const data = getFrequencies(pixelValues);
        drawChart(data);
      }


      // The layer is displaying the wind data in beaufort meters.
      // Create wind rose chart based on the layer legend
      // https://en.wikipedia.org/wiki/Beaufort_scale
      // https://www.weather.gov/mfl/beaufort
      const forces = [0.2, 1.8, 3.3, 5.4, 8.5, 11, 14.1, 17.2, 20.8, 24.4, 28.6, 32.7];
      const forcesLabels = ["0-0.2", "0.2-1.8", "1.8-3.3", "3.3-5.4", "5.4-8.5", "8.5-11", "11-14.1", "14.1-17.2", "17.2-20.8", "20.8-24.4", "24.4-28.6", "28.6-32.7"];
      const backgroundColor = [
        "rgb(69,117,181)", //0.2
        "rgb(101,137,184)", //1.8
        "rgb(132,158,186)", //3.3
        "rgb(162,180,189)", //5.4
        "rgb(192,204,190)", //8.5
        "rgb(222,227,191)", //11
        "rgb(255,255,191)", //14.1
        "rgb(255,220,161)", //17.2
        "rgb(245,152,105)", //20.8
        "rgb(237,117,81)", //24.4
        "rgb(237,117,81)", //28.6
        "rgb(232,21,21)" //32.7
      ];

      // this function calculates the percentage of different wind speeds (12 beaufort scales) flew
      // from 16 different directions.
      function getFrequencies(data) {
        const segments = 16;
        const segmentAngle = 360 / segments;
        let total = data.length;
        let windSpeedFrequency = [];

        for (let i = 0; i < segments; i++) {
          windSpeedFrequency[i] = new Float32Array(12);
        }
        // get the beaufort scale meters per second
        let getBeaufortScale = function (windSpeed) {
          let scale = 12;
          for (let i = 0; i < 12; i++) {
            if (forces[i] >= windSpeed) {
              scale = i;
              break;
            }
          }
          return scale;
        };

        // loop through wind data and set the beaufort wind scale
        for (let i = 0; i < total; i++) {
          let monthData = data[i]; // this data returns wind data for each month for given years
          let direction = monthData[1];

          // check the given direction and identify which sector it belongs to the chart
          let directionSegment = Math.round((direction + segmentAngle / 2) / segmentAngle);
          if (directionSegment >= segments) {
            directionSegment = segments - 1;
          }
          const windScale = getBeaufortScale(monthData[0]);
          if (windScale != 0) {
            windSpeedFrequency[directionSegment][windScale]++;
          }
        }

        // prep the wind rose chart data for the polarArea chart
        const transposed = _.zip.apply(_, windSpeedFrequency);
        return transposed;
      }

      function drawChart(data) {
        let dataset = [];
        data.forEach((item, i) => {
          dataset.push({
            data: item,
            backgroundColor: backgroundColor[i],
            label: forcesLabels[i]
          });
        });
        if (!windRoseChart) {
          const ctx = document
            .getElementById("windRose-chart")
            .getContext("2d");
          windRoseChart = new Chart(ctx, {
            type: "polarArea",
            data: {
              labels: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
              datasets: dataset
            },
            options: {
              layout: {
                padding: 5
              },
              legend: {
                display: false
              },
              scale: {
                angleLines: {
                  // shows border for angle/sector lines
                  display: true,
                  center: true
                },
                stacked: true, // stack the bars
                pointLabels: {
                  fontSize: 12,
                  fontColor: "ff0000",
                  display: true
                },
                ticks: {
                  beginAtZero: true,
                  callback: (value, data) => {
                    const percent = Math.round((value * 100) / 365)
                    return percent + "%";
                  }
                }
              },
              tooltips: {
                callbacks: {
                  label: (tooltipItem, data) => {
                    var label = data.datasets[tooltipItem.datasetIndex].label || "";
                    if (label) {
                      label += ": ";
                    }
                    label += Math.round((tooltipItem.value * 100) / 365) + "%";
                    return label;
                  }
                }
              }
            }
          });
        } else {
          windRoseChart.data.datasets = [];
          windRoseChart.data.datasets = dataset;
          windRoseChart.update();
        }
      }

    //   const actionNodes = document.querySelectorAll("calcite-action");
    //   const contentNodes = [document.getElementById("app-code")];
    //   document.getElementById("actionBar").addEventListener("click", (evt) => {
    //     const actionButton = evt.composedPath().find(({ tagName }) => tagName === "calcite-action".toUpperCase());
    //     if (!actionButton) {
    //       return;
    //     }
    //     actionNodes.forEach((node) => {
    //       if (node === actionButton) {
    //         node.setAttribute("active", "");
    //       } else {
    //         node.removeAttribute("active");
    //       }
    //     });
    //     const targetName = actionButton.getAttribute("action-target");
    //     contentNodes.forEach((node) => {
    //       if (node.id === targetName) {
    //         node.classList.add("active");
    //         node.setAttribute("open", "true");
    //       } else {
    //         node.classList.remove("active");
    //         node.setAttribute("open", "false");
    //       }
    //     });
    //   });
      // hljs.highlightAll();
      // hljs.initLineNumbersOnLoad();
    })());