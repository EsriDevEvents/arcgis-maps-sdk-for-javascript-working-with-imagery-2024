require(["esri/Basemap", "esri/layers/VectorTileLayer", "esri/geometry/Point"], function(Basemap, VectorTileLayer, Point) {
    const map = document.querySelector("arcgis-map");

    map.addEventListener("arcgisViewReadyChange", () => {
        map.goTo({center: new Point({ x: 76870, y: 6777577, spatialReference: { wkid: 25833 } }), zoom: 7});
    });

    map.basemap = new Basemap({
        baseLayers: [
            new VectorTileLayer({
                url: "https://services.geodataonline.no/arcgis/rest/services/GeocacheVector/GeocacheNordenGraatone/VectorTileServer",
                title: "Basemap"
            })
        ],
        title: "basemap",
        id: "basemap"
    });
  });