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

////////////// 1. Selecting Origin and Destination //////////////

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




//////// 2. Displaying Origin and Destination in Side Bar ////////////

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






//////////// 3. Create Time Charts (initially empty) ///////////////


// Global travel time variables
var gtfsTimeAM = null,
    gtfsTimeMid = null,
    gtfsTimePM = null,
    scenario1TimeAM = null,
    scenario1TimeMid = null,
    scenario1TimePM = null;


var createTimeChart = function(barValues, barNames, chartName, htmlSelector) {

    // Define constants
    var h = 80,
        w = 200,
        margin = {top: 30, bottom: 30, left: 70, right: 10},
        barWidth = 20,
        barPadding = 8;

    // Make empty SVG
    var svg = d3.select(htmlSelector).append("svg")
        .attr("height", h + margin.bottom + margin.top)
        .attr("width", w + margin.left + margin.right);

    // X and Y scales
    var xScale = d3.scaleLinear()
        .domain([0, d3.max(barValues)])
        .range([0, w]);

    var yScale = d3.scaleLinear()
        .domain([0, barValues.length])
        .range([margin.top, h]);

    // Data bind
    var bars = svg.selectAll("rect")
        .data(barValues);

    // Enter Data - bars are styled over in the css
    bars.enter()
        .append("rect")
        .attr("class", "bars")
        .attr("x", margin.left)
        .attr("width", function(d) {
            return xScale(d)
        })
        .attr("y", function(d,i) {
            return yScale(i)
        })
        .attr("height", barWidth);

    // Axes
    var xAxis = d3.axisBottom(xScale);
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + margin.left + "," + h + ")")
        .call(xAxis);

    // Give it a title
    var title = svg.append("text")
        .attr("x", (w / 2))
        .attr("y", margin.top/2)
        .attr("text-anchor", "middle")
        .text(chartName)
};

//////// Call initial createChart Funciton ////////////
createTimeChart([5,10], [],"AM Peak","#chart-am" );
createTimeChart([4,3], [],"Midday","#chart-mid" );
createTimeChart([6,10], [],"PM Peak","#chart-pm" );



///////////// 4. Update Travel Times //////////////

var updateTravelTimes = function() {

    // Function for calculating time difference between origin and destination
    // Inputs are ("schedule", "scenario1") and time period ("am", "mid", "pm")
    var timeDifference = function(scenario, period) {
        var column = scenario + "_" + period;
        var origin = gtfsData[selectedOriginId][column];
        var destination = gtfsData[selectedDestinationId][column];
        travelTime = (destination - origin) / (60 * 1000);
        return travelTime
    }

    if (selectedOriginId && selectedDestinationId) {

        // Calculate travel times based on origin and destination, store results in globals
        gtfsTimeAM = timeDifference("schedule", "am");
        gtfsTimeMid = timeDifference("schedule", "mid");
        gtfsTimePM = timeDifference("schedule", "pm");

        // Calculate scenario1 times
        scenario1TimeAM = timeDifference("scenario1", "am");
        scenario1TimeMid = timeDifference("scenario1", "mid");
        scenario1TimePM = timeDifference("scenario1", "pm");

        console.log("Schedule am: " + gtfsTimeAM + ", Scenario1: " + scenario1TimeAM);
        console.log("Schedule mid: " + gtfsTimeMid + ", Scenario1: " + scenario1TimeMid);
        console.log("Schedule pm: " + gtfsTimePM + ", Scenario1: " + scenario1TimePM);

        // Call updateBarGraph passing in arrays and labels
        var barValuesAm = [gtfsTimeAM, scenario1TimeAM],
            barValuesMid = [gtfsTimeMid, scenario1TimeMid],
            barValuesPM = [gtfsTimePM, scenario1TimePM],
            barNames = ["Schedule", "Scenario 1"]

        //updateBarGraph(barValuesAm, barNames, "AM Peak", "#chart-am");
        //updateBarGraph(barValuesMid, barNames, "Midday", "#chart-mid");
        //updateBarGraph(barValuesPM, barNames, "PM Peak", "#chart-pm");
    }
};


/////// The main function called when a selection changes /////////
var updateSidebar = function () {
    updateODNames();
}




///////////// Prep D3 Data ///////////////

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
        d.schedule_am = parser(d.schedule_am);
        d.schedule_mid = parser(d.schedule_mid);
        d.schedule_pm = parser(d.schedule_pm);
        d.scenario1_am = parser(d.scenario1_am);
        d.scenario1_mid = parser(d.scenario1_mid);
        d.scenario1_pm = parser(d.scenario1_pm);

        // Add object to searchable dictionary
        stopTimeData[d.stop_id] = d;
    });

    console.log(stopTimeData);

    // set global gtfsTimeData to this stopTimeData
    gtfsData = stopTimeData;
});