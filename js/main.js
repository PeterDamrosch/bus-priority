//////////////// MAP ////////////////

// Base layers

var CartoDB_Positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    maxZoom: 19
});

var Esri_WorldImagery = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var Hydda_Full = L.tileLayer('http://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
    attribution: 'Tiles courtesy of <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

// Initialize map
var map = new L.Map("map", {center: [42.359, -71.10], zoom: 14})
    .addLayer(CartoDB_Positron);

// Baselayer control for map
var baseLayers = {
    "CartoDB" : CartoDB_Positron,
    "Streets": Hydda_Full,
    "Satellite": Esri_WorldImagery
};

// Toggle baselayers - Good tutorial that explains this on leafletjs.com
L.control.layers(baseLayers, null, {position: 'topleft'}).addTo(map);



////////////// Add Basic Bus Route and Stops ////////////

// Style and color constants for route and stops
var routeColor = "#3498DB",
    routeOpacity = 1,
    selectStopColor = "#E74C3C",
    selectStopRadius = 7,
    neutralStopColor = "white",
    neutralStopRadius = 5.5;

// Bus route sylte
var busRouteStyle = {
    color: routeColor,
    opacity: routeOpacity
}

// Add Bus Route - get data using jQuery
var busRoute = null;
$.getJSON("data/mbta_1_to_dudley.geojson", function(data) {
    busRoute = L.geoJson(data, {
        style: busRouteStyle
    }).addTo(map)
});

var neutralStopOptions = {
    radius: neutralStopRadius,
    fillColor: neutralStopColor,
    fillOpacity: 1,
    opacity: 1,
    color: routeColor
};
var selectedStopOptions = {
    radius: selectStopRadius,
    fillColor: neutralStopColor,
    fillOpacity: 1,
    opacity: 1,
    color: selectStopColor,
    weight: 3
};

var busStops = null;

// Add stops - binding onEachFeatureStop is the key functionality defined below
$.getJSON("data/stops1_geojson.geojson", function(data) {
    busStops = L.geoJson(data, {
        onEachFeature: onEachFeatureStop,
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, neutralStopOptions)
        }
    }).addTo(map);
});



////////////// Selecting Origin and Destination //////////////
var selectedOriginId = null,
    selectedDestinationId = null;

// Update global variables for selectedOriginId/Desination depending on what's already been clicked
// then it calls the update functions

var onEachFeatureStop = function (feature, layer) {
    layer.on("click", function(e) {
        var clicked_id = feature.properties.stop_id;
        if (clicked_id == selectedOriginId) {
            selectedOriginId = null;
        } else if (clicked_id == selectedDestinationId) {
            selectedDestinationId = null;
        } else if (!selectedOriginId) {
            selectedOriginId = clicked_id;
        } else if (!selectedDestinationId) {
            selectedDestinationId = clicked_id;
        } else if (selectedOriginId && selectedDestinationId) {
            selectedDestinationId = null;
            selectedOriginId = clicked_id;
        }

        // New styles after updating selected origin/desination logic
        updateStopStyle();
        updateSidebar();
    })
};

// Two styles - one for if something is "selected", one if it's not
var updateStopStyle = function() {
    busStops.eachLayer(function(feature) {
        stop_id = feature.feature.properties.stop_id;
        if (stop_id == selectedOriginId || stop_id == selectedDestinationId ) {
            feature.setStyle(selectedStopOptions)
        } else {
            feature.setStyle(neutralStopOptions)
        }
    })
}


// This function connects the selection to the data source, currently a csv but later could be a call to
// an API


//////// Displaying Origin and Destination in Side Bar ////////////

var updateSidebar = function () {
    updateODNames();
    updateTimeChart()
}

var updateODNames = function () {
    if (selectedOriginId) {
        var originName = gtfsData[selectedOriginId].stop_name;
        $('#display-origin').html(originName)
    } else {
        $('#display-origin').html("")
    }
    if (selectedDestinationId) {
        var desinationName = gtfsData[selectedDestinationId].stop_name;
        $('#display-destination').html(desinationName)
    } else {
        $('#display-destination').html("")
    }
};


// Global travel time variables
var travelTimeAM = null,
    travelTimeMid = null,
    travelTimePM = null;

var updateTimeChart = function() {
    if (selectedOriginId && selectedDestinationId) {

        // Calculate travel times based on origin and destination
        originAM = gtfsData[selectedOriginId].departure_time_am;
        departureAM = gtfsData[selectedDestinationId].departure_time_am;
        travelTimeAM = (departureAM - originAM) / (60 * 1000);
        console.log("Travel time AM: " + travelTimeAM);

        originMid = gtfsData[selectedOriginId].departure_time_mid;
        departureMid = gtfsData[selectedDestinationId].departure_time_mid;
        travelTimeMid = (departureMid - originMid) / (60 * 1000);
        console.log("Travel time midday: " + travelTimeMid);

        originPM = gtfsData[selectedOriginId].departure_time_pm;
        departurePM = gtfsData[selectedDestinationId].departure_time_pm;
        travelTimePM = (departurePM - originPM) / (60 * 1000);
        console.log("Travel time PM: " + travelTimePM)
    }
};


/// Prep D3 Data ///


var gtfsData = null;
d3.csv("data/stops1_random_scenarios.csv", function(error, data) {
    if (error) throw error;
    console.log(data);

    // Dictionary to make stop times searchable by stop_id
    stopTimeData = {};
    // Parse strings into datetime objects
    var parser = d3.timeParse("%H:%M:%S");
    data.forEach(function(d) {
        // Convert strings to numbers
        d.stop_sequence = +d.stop_sequence;
        d.stop_id = +d.stop_id;

        // Convert strings to datetime objects
        d.departure_time_am = parser(d.departure_time_am);
        d.departure_time_mid = parser(d.departure_time_mid);
        d.departure_time_pm = parser(d.departure_time_pm);
        d.scenario1_am = parser(d.scenario1_am);
        d.scenario1_mid = parser(d.scenario1_mid);
        d.scenario1_pm = parser(d.scenario1_pm);

        // Add object to searchable dictionary
        stopTimeData[d.stop_id] = d;
    });

    console.log(stopTimeData);

    // set global gtfsTimeData to this stopTimeData
    gtfsData = stopTimeData;
    updateSidebar()
});