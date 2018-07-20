var dojoConfig = {
    has: {
        "esri-featurelayer-webgl": 1
    }
};
require([
    "esri/Map",
    "esri/WebMap",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/Graphic",
    "esri/widgets/Search",
    "dojo/domReady!"
], function (Map, WebMap, MapView, FeatureLayer, GraphicsLayer, Graphic, Search) {
    /******************************************************************
     * Variables
     ******************************************************************/
    var selectedState = "";
    var selectedStateDistrictCount = 0; // number of districts for selected state.
    var popupTemplate = {
        title: "Info:",
        content: (features) => {
            if (isDefined(features) && isDefined(features.graphic) && isDefined(features.graphic.attributes)) {
                return getDistrictInfoByGeoid(features.graphic.attributes);
            } else {
                return "";
            }
        }
    };
    var memberLink = "https://clerkpreview.house.gov/members/";

    /******************************************************************
     * Set up feature layer for US Territories
     ******************************************************************/
    var usStatelayer = new FeatureLayer({
        url: "https://services1.arcgis.com/o90r8yeUBWgKSezU/arcgis/rest/services/US_Territories/FeatureServer",
        outFields: ["*"],
        renderer: {
            type: "simple", // autocasts as new SimpleRenderer()
            symbol: {
                type: "simple-fill", // autocasts as new SimpleFillSymbol()
                color: [107, 107, 107, 0.1],
                outline: {
                    color: [128, 128, 128],
                    width: 0.7
                }
            }
        }
    });

    /******************************************************************
     * Set up feature layer for US Congressional District. This layer is not visibile by default.
     ******************************************************************/
    var usdistrictlayer = new FeatureLayer({
        url: "https://services1.arcgis.com/o90r8yeUBWgKSezU/arcgis/rest/services/us_congressional_district_114/FeatureServer",
        outFields: ["*"],
        visible: false
    });

    /******************************************************************
     * Set up feature layer for displaying US district layer 
     ******************************************************************/
    var graphicsLayer = new GraphicsLayer({
        graphics: []
    });

    /******************************************************************
     * Set up map using us state, district layer, and graphics layer.
     ******************************************************************/
    map = new WebMap({
        portalItem: { // autocasts as new PortalItem()
            id: "70943bda8a37419f863a361ccc00a216"
        },
        layers: [usStatelayer, usdistrictlayer, graphicsLayer]
    });

    mapview = new MapView({
        container: "viewDiv",
        map: map,
        zoom: 4,
        center: [-96.1, 38.8],
        popup: {
            title: "NAMELSAD",
            highlightEnabled: false,
            dockEnabled: true,
            dockOptions: {
                breakpoint: false,
                position: "bottom-right"
            }
        },
        ui: {
            components: ["attribution"]
        },
        constraints: {
            minZoom: 4,
            // maxZoom: 7,
            rotationEnable: false,
            snapToZoom: false,
        }
    });



    /******************************************************************
     * Initialize map
     ******************************************************************/

    function initialize() {
        // ensure mapview is loaded.
        mapview.when(function () {
            // ensure us statelayer is laoded.
            return mapview.whenLayerView(usStatelayer);
        }).then(function () {
            // ensure district layer is loaded.
            return mapview.whenLayerView(usdistrictlayer);
        }).then(function () {
            initializeUI();
            // load all features.
            return usStatelayer.queryFeatures({
                where: "1=1", // using always true condition 
                returnGeometry: true,
                outFields: ["NAME", "STATEFP"]
            });
        }).then(function (stateQueryResponse) {
            // initialize dropdown
            var $stateDropDown = $("#stateSelect");
            var features = stateQueryResponse.features.sort(function (a, b) {
                var first = a.attributes.NAME.toLowerCase();
                var second = b.attributes.NAME.toLowerCase();
                if (first < second) {
                    return -1;
                }
                if (first > second) {
                    return 1;
                }
                return 0;
            });
            $.each(features, function (index, value) {
                $stateDropDown.append("<option value='" + value.attributes.STATEFP + "'>" + value.attributes.NAME + "</option>")
            });

            // add on change event on state dropdown
            $stateDropDown.on("change", function () {
                onStateDropDownChanged($stateDropDown.val());
            });

            // add mouse click on mapview
            mapview.on("pointer-down", function (event) {
                mapview.hitTest(event).then(function (response) {
                    try {
                        event.preventDefault();
                    } catch (e) {}
                    onMapViewClicked(response);
                });
            });
        });
    }

    function initializeUI() {
        // intialize search widget
        var searchWidgets = new Search({
            view: mapview,
            goToOverride: function () {}, // remove default goto of search
        });
        // add search widget wot mapview
        mapview.ui.add(searchWidgets, {
            position: "top-right",
            index: 2
        });

        searchWidgets.on("search-complete", function (event) {
            onSearchComplete(event);
        });

        searchWidgets.on("search-clear", function (event) {
            clearPoint();
        });

        // add dropdown on top right of map.
        mapview.ui.add("infoDiv", "top-right"); // dropdown control
    }

    initialize();

    /******************************************************************
     * Event handler
     ******************************************************************/
    function onMapViewClicked(eventResponse) {
        if (eventResponse.results.length > 0) {
            var feature = eventResponse.results.filter(function (result) {
                return result.graphic.layer === usStatelayer;
            })[0].graphic;
            var stateFp = feature.attributes.STATEFP;
            if (selectedState !== stateFp) {
                $("#stateSelect").val(stateFp);
                clearPoint();
                selectedState = stateFp;
                addDistrictsToGraphicLayer(feature.attributes.STATEFP);
                goTo(feature.geometry);
            }
        }
    }

    function onStateDropDownChanged(stateKey) {
        usStatelayer.queryFeatures({
            where: "STATEFP=" + stateKey,
            returnGeometry: true,
            outFields: ["STATEFP"]
        }).then(function (response) {
            goTo(response.features[0].geometry);
        });
        if (selectedState !== stateKey) {
            addDistrictsToGraphicLayer(stateKey);
        }
    }

    function onSearchComplete(searchEvent) {
        // close popup if any open.
        mapview.popup.close();
        if (searchEvent.results.length > 0 && searchEvent.results[0].results.length > 0) {
            var features = searchEvent.results[0].results;
            if (features.length > 0) {
                var searchedFeature = features[0].feature;
                // find state using coordinates of search result.
                usStatelayer.queryFeatures({
                    geometry: searchedFeature.geometry,
                    returnGeometry: true,
                    outFields: ["STATEFP"]
                }).then(function (result) {
                    if (result.features.length > 0) {
                        var statefp = result.features[0].attributes.STATEFP;
                        if (selectedState !== statefp) {
                            selectedState = statefp;
                            addDistrictsToGraphicLayer(result.features[0].attributes.STATEFP).then(function () {
                                handleSearch(searchedFeature);
                            });
                        } else {
                            handleSearch(searchedFeature);
                        }
                        goTo(result.features[0].geometry)
                    }
                });
            }
        }
    }

    /**
     * function to handle what to do when the search is not state or it is deeper than state.
     * Clears previously existing circular points, adds new point and shows popup
     */
    function handleSearch(feature) {
        clearPoint();
        if (isDefined(feature)) {
            if ((isDefined(feature.attributes.City) && feature.attributes.City !== "") ||
                (isDefined(feature.attributes.StAddr) && feature.attributes.StAddr !== "")) {
                addPoint(feature.geometry);
                usdistrictlayer.queryFeatures({
                    geometry: feature.geometry,
                    returnGeometry: true,
                    outFields: ["*"]
                }).then(function (response) {
                    mapview.popup.open({
                        title: "Info",
                        content: getDistrictInfoByGeoid(response.features[0].attributes),
                    });
                });
            }
        }
    }

    /**
     * for adding a circular blue point in the map 
     * geometry: geomerty for where to show the point
     */
    function addPoint(geometry) {
        graphicsLayer.add({
            geometry: geometry,
            symbol: {
                type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
                color: "blue",
                size: 12,
                outline: { // autocasts as new SimpleLineSymbol()
                    width: 0.5,
                    color: "darkblue"
                }
            }
        });
    }

    /**
     * function to take in stateFp and then add graphic layer for all districts within the state
     * can be both string or number
     */
    function addDistrictsToGraphicLayer(statefp) {
        return new Promise(function (resolve) {
            graphicsLayer.removeAll();
            usdistrictlayer.queryFeatures({
                where: "STATEFP=" + statefp,
                returnGeometry: true,
                outFields: ["*"] // ["GEOID", "STATEFP"]
            }).then(function (result) {
                if (isDefined(result.features)) {
                    var districtColors = disColors;
                    selectedStateDistrictCount = result.features.length;
                    var graphics = result.features.map(function (feature) {
                        var districtColor = "#B9DEEB";
                        for (var i = 0; i < districtColors.length; i++) {
                            if (districtColors[i].GEOID === feature.attributes.GEOID) {
                                districtColor = districtColors[i].color;
                                break;
                            }
                        }
                        var polylineGraphic = new Graphic({
                            geometry: feature.geometry,
                            symbol: {
                                type: "simple-fill",
                                color: districtColor,
                            },
                            attributes: feature.attributes,
                            popupTemplate: popupTemplate,
                        });
                        return polylineGraphic;
                    });
                    graphicsLayer.addMany(graphics);
                    resolve();
                }
            });
        });
    }

    /**
     * Get popup content for a district. Shows state, district, image & name of representative
     */
    function getDistrictInfoByGeoid(attributes) {
        if (isDefined(attributes)) {
            var geoid = attributes.GEOID
            for (var i = 0; i < members.length; i++) {
                if (members[i].GEOID === geoid) {
                    return `
                    <div class="borderedRow">
                        <div class="col6">
                            <p>State: ${members[i].StateCode}</p>
                            <p>District: ${members[i].StateDistrict}</p>
                            <p>Representative: ${members[i].Member}</p>
                        </div>
                        <div class="col6">
                            <a href="${memberLink + members[i].Id}" target="_blank">
                             <img src="https://clerkpreview.house.gov/content/assets/img/members/${members[i].Id}.jpg"/>
                            </a>
                        </div>
                    </div>
                    `;
                }
            }
        }
        return "";
    }

    /**
     *  check and remove the point from map
     */
    function clearPoint() {
        if (selectedStateDistrictCount > 0 && graphicsLayer.graphics.items.length > selectedStateDistrictCount) {
            graphicsLayer.remove(graphicsLayer.graphics.items[selectedStateDistrictCount])
        }
    }

    /**
     * this function takes geometry for zoom. 
     * TODO: setting padding on boundary.
     */
    function goTo(geometry) {
        mapview.goTo({
            target: geometry,
        }, {
            duration: 2000,
            easing: "ease-in-out"
        });
    }

    // check if value is defined.
    function isDefined(value) {
        return value !== null && typeof (value) !== "undefined";
    }

});