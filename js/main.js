//////////////// 1. Initialize map ////////////////

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



////////////// 2. Add Basic Bus Route and Stops ////////////

// Style and color constants for route and stops
var routeColor = "#3498DB",
    routeOpacity = 1,
    selectedRouteWeight = 5,
    selectStopColor = "#E74C3C",
    selectStopRadius = 7,
    neutralStopColor = "white",
    neutralStopRadius = 5.5;

// Default route style
var busRouteStyle = {
    color: routeColor,
    opacity: routeOpacity
}

// Selected subset route style
var selectdRouteStyle = {
    color: selectStopColor,
    opacity: 1,
    weight: selectedRouteWeight
}


// Hold route and layer
var route_1_geojson = null;
var busRoute = null;

$.getJSON("data/route1_full.geojson", function(data) {

    // Store the raw GeoJSON to use again later
    route_1_geojson = data;

    // Add the static route
    busRoute = L.geoJson(data, {
        style: busRouteStyle
    }).addTo(map)
});

var neutralStopOptions = {
    radius: neutralStopRadius,
    fillColor: neutralStopColor,
    fillOpacity: 1,
    opacity: 1,
    color: routeColor,
};
var selectedStopOptions = {
    radius: selectStopRadius,
    fillColor: neutralStopColor,
    fillOpacity: 1,
    opacity: 1,
    color: selectStopColor,
    weight: 3
};

// Function for adding stops
var busStopsLayer = null;

var addStopsLayer = function() {
    if(map.hasLayer(busStopsLayer)) {
        map.removeLayer(busStopsLayer);
    }

    // Add parent stops - binding onEachFeatureStop is the key functionality defined below
    $.getJSON("data/parentStops_route1.geojson", function(data) {
        busStopsLayer = L.geoJson(data, {
            onEachFeature: onEachParentStop,
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, neutralStopOptions)
            }
        }).addTo(map);
    });
};

// Call it to begin with
addStopsLayer();


////////////// 3. Selecting Origin and Destination //////////////

var parentOrigin = null,
    parentDestination = null;

var selectedOriginId = null,
    selectedDestinationId = null;

// Update global variables for selectedOriginId/Desination depending on what's already been clicked
// then it calls the update functions

var onEachParentStop = function (feature, layer) {
    layer.on("click", function(e) {
        var clickedParent = feature.properties;
        if (clickedParent == parentOrigin) {
            parentOrigin = null;
            selectedOriginId = null;
        } else if (clickedParent == parentDestination) {
            parentDestination = null;
            selectedDestinationId = null;
        } else if (!parentOrigin) {
            parentOrigin = clickedParent
        } else if (!parentDestination) {
            parentDestination = clickedParent
        } else if (parentOrigin && parentDestination) {
            parentDestination = null;
            selectedDestinationId = null;

            parentOrigin = clickedParent
        }

        // If at the end of reassigning parent, have a full set, process to see inbound/outbound
        if (parentOrigin && parentDestination) {
            assignDirection()
        }

        // NEED TO REORGANIZE WHAT GETS CALLED AFTER SELECTION, EVEN IF ONLY FOR CLEANLINESS
        updateVisualization();
    })
};

// Assigns the major globals of gtfsData, selectedOriginId and selectedDestinationId
var assignDirection = function() {
    var inboundChild_originID = parentOrigin.child_1,
        inboundChild_destinationID = parentDestination.child_1,
        outboundChild_originID = parentOrigin.child_0,
        outboundChild_destinationID = parentDestination.child_0,
        inboundChild_originStopSequence = inboundStops[inboundChild_originID].stop_sequence,
        inboundChild_destinationStopSequence = inboundStops[inboundChild_destinationID].stop_sequence;

    if (inboundChild_destinationStopSequence > inboundChild_originStopSequence) {
        gtfsData = inboundStops;
        selectedOriginId = inboundChild_originID;
        selectedDestinationId = inboundChild_destinationID
    } else {
        gtfsData = outboundStops;
        selectedOriginId = outboundChild_originID;
        selectedDestinationId = outboundChild_destinationID;
    }
    console.log(gtfsData, selectedOriginId, selectedDestinationId)
};

/* Old on each feature (ellipsed out July 18)
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

        updateVisualization();
    })
};

*/


//////////// 4. Update Map Features - Stop and Line //////////////////

// Two styles - one for if something is "selected", one if it's not
var updateStopStyle = function() {
    busStopsLayer.eachLayer(function(feature) {
        featureID = feature.feature.properties;
        if (featureID == parentOrigin || featureID == parentDestination) {
            feature.setStyle(selectedStopOptions)
        } else {
            feature.setStyle(neutralStopOptions)
        }
    })
};

var selectedLineLayer = null;

/* Commented out, need to a) draw a new route line
b) update indices for both stops0 and stops1 with new line
c) then figure out the stuff with adding the line and removing it

var updateSelectedRouteLine = function() {

    if (selectedOriginId && selectedDestinationId) {

        if(map.hasLayer(selectedLineLayer)) {
            map.removeLayer(selectedLineLayer);
        }

        // Pull out coordinate indices that correspond to those stop locations
        var originIndex = gtfsData[selectedOriginId].line_index,
            destinationIndex = gtfsData[selectedDestinationId].line_index;

        // Create a copy of the route
        var selectedLine = jQuery.extend(true, {}, route_1_geojson);

        // Modify the geometry to have just the subset of the selected route using the indices
        var lineCoordinates = selectedLine.features[0].geometry.coordinates;
        var subsetGeometry = lineCoordinates.slice(originIndex, destinationIndex);
        selectedLine.features[0].geometry.coordinates = subsetGeometry;

        // Add route to map - style defined above with routeStyle
        var selectedLineLayer = L.geoJson(selectedLine, {
            style: selectdRouteStyle
        })

        map.addLayer(selectedLineLayer)
    }
};
*/


/////// 5. The main function called when a selection changes /////////

var updateVisualization = function() {

    // Map updates
    //updateSelectedRouteLine(); Commented out at the moment
    updateStopStyle();

    // Sidebar updates
    updateODNames();
    updateTravelTimes()
};



//////// 6. Displaying Origin and Destination in Side Bar ////////////

var updateODNames = function () {
    if (selectedOriginId) {
        var originName = gtfsData[selectedOriginId].stop_name;
        $('#display-origin').html(originName)
    } else {
        $('#display-origin').html("- -")
    }
    if (selectedDestinationId) {
        var desinationName = gtfsData[selectedDestinationId].stop_name;
        $('#display-destination').html(desinationName)
    } else {
        $('#display-destination').html("- -")
    }
};



//////////// 7. Displaying Travel Time Boxes ///////////////

// Global travel time variables
var scenario_1_am = null,
    scenario_1_mid = null,
    scenario_1_pm = null,
    scenario_2_am = null,
    scenario_2_mid = null,
    scenario_2_pm = null;

var updateTravelTimeBoxes = function() {
    if (selectedOriginId || selectedDestinationId) {
        $('#am-scenario-1').html(scenario_1_am);
        $('#am-scenario-2').html(scenario_2_am);
        $('#mid-scenario-1').html(scenario_1_mid);
        $('#mid-scenario-2').html(scenario_2_mid);
        $('#pm-scenario-1').html(scenario_1_pm);
        $('#pm-scenario-2').html(scenario_2_pm);
    } else {
        $('#am-scenario-1').html("- -");
        $('#am-scenario-2').html("- -");
        $('#mid-scenario-1').html("- -");
        $('#mid-scenario-2').html("- -");
        $('#pm-scenario-1').html("- -");
        $('#pm-scenario-2').html("- -");
    }
};



/*
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

*/




///////////// 8. Calculating Travel Times //////////////

var updateTravelTimes = function() {

    // Function for calculating time difference between origin and destination
    // Inputs are ("schedule", "scenario_2_") and time period ("am", "mid", "pm")
    var timeDifference = function(scenario, period) {
        var column = scenario + "_" + period;
        var origin = gtfsData[selectedOriginId][column];
        var destination = gtfsData[selectedDestinationId][column];
        travelTime = (destination - origin) / (60 * 1000);
        return travelTime
    }

    if (selectedOriginId && selectedDestinationId) {

        // Calculate travel times based on origin and destination, store results in globals
        scenario_1_am = timeDifference("scenario_1", "am");
        scenario_1_mid = timeDifference("scenario_1", "mid");
        scenario_1_pm = timeDifference("scenario_1", "pm");

        // Calculate scenario_2_ times
        scenario_2_am = timeDifference("scenario_2", "am");
        scenario_2_mid = timeDifference("scenario_2", "mid");
        scenario_2_pm = timeDifference("scenario_2", "pm");


        /*
        console.log("scenario_1 am: " + scenario_1_AM + ", Scenario2: " + scenario_2_TimeAM);
        console.log("scenario_1 mid: " + scenario_1_Mid + ", Scenario2: " + scenario_2_TimeMid);
        console.log("scenario_1 pm: " + scenario_1_PM + ", Scenario2: " + scenario_2_TimePM);


        // Call updateBarGraph passing in arrays and labels
        var barValuesAm = [scenario_1_AM, scenario_2_TimeAM],
            barValuesMid = [scenario_1_Mid, scenario_2_TimeMid],
            barValuesPM = [scenario_1_PM, scenario_2_TimePM],
            barNames = ["Schedule", "Scenario 1"]

        //updateBarGraph(barValuesAm, barNames, "AM Peak", "#chart-am");
        //updateBarGraph(barValuesMid, barNames, "Midday", "#chart-mid");
        //updateBarGraph(barValuesPM, barNames, "PM Peak", "#chart-pm");
        */

        updateTravelTimeBoxes();

        // Map Analytics to reflect new OD
        pushMapState("ODSelection")
    }
};


///////////// 9. Prep D3 Data ///////////////

// Globals
var gtfsData = null;
var inboundStops = null;
var outboundStops = null;

// Functioning for cleaning data and creating searchable dictionary keyed on stop_id
var cleanStops = function(data) {
    // Dictionary to make stop times searchable by stop_id
    stopTimeData = {};
    // Parse strings into datetime objects
    var parser = d3.timeParse("%H:%M:%S");
    data.forEach(function(d) {
        // Convert strings to numbers
        d.stop_sequence = +d.stop_sequence;
        d.stop_id = +d.stop_id;

        // Convert strings to datetime objects
        d.scenario_1_am = parser(d.schedule_am);
        d.scenario_1_mid = parser(d.schedule_mid);
        d.scenario_1_pm = parser(d.schedule_pm);
        d.scenario_2_am = parser(d.scenario_2_am);
        d.scenario_2_mid = parser(d.scenario_2_mid);
        d.scenario_2_pm = parser(d.scenario_2_pm);

        // Add object to searchable dictionary
        stopTimeData[d.stop_id] = d;
    });

    return stopTimeData
};

// Load inbound and outbound stops, clean, and set to corresponding global variables
d3.csv("data/stops1_new_index.csv", function(error, dataInbound) {
    if (error) throw error;
    inboundStops = cleanStops(dataInbound);

    d3.csv("data/stops0_new_index.csv", function(error, dataOutbound) {
        if (error) throw error;
        outboundStops = cleanStops(dataOutbound);
    });
});





///////// 10. Map Analytics //////////

// Define a user
function createUserID() {
    return new Date().getTime() + Math.random().toString(36).substring(0,5)
}

// Initial state
var userID = createUserID();
ga('set', 'dimension1', userID); // session-scoped for GA, only set once, the other dimensions are hit-scope, reset every time

var eventSequence = 0;
var zoomLevel = map.getZoom();
var mapBounds = map.getBounds().toBBoxString(); // form is 'southwest_lng,southwest_lat,northeast_lng,northeast_lat'

// Event Listener 1 - Move/Zoom (every zoom ends with a leaflet moveend event, so map.on("movend") should capture both
map.on("moveend", onMoveend);
function onMoveend() {
    zoomLevel = map.getZoom();
    mapBounds = map.getBounds().toBBoxString();
    pushMapState("moveend")
};

// Even Listener 2 are select origin and destination, implemented above

// Function to push current map state to Google Analytics (right now just logging)
var pushMapState = function (eventType) {

    var eventTime = new Date().getTime();
    var eventType = eventType;

    ga('set', 'dimension2', eventTime);
    ga('set', 'dimension3', eventType);
    ga('set', 'dimension4', eventSequence);
    ga('set', 'dimension5', zoomLevel);
    ga('set', 'dimension6', mapBounds);

    // Undefined dimensions don't get sent to GA so need to make a string if they're undefined
    if (selectedOriginId) {
        ga('set', 'dimension7', selectedOriginId);
    } else {
        ga('set', 'dimension7', 'NULL')
    }

    if (selectedDestinationId) {
        ga('set', 'dimension8', selectedDestinationId);
    } else {
        ga('set', 'dimension8', 'NULL')
    }

    ga('send', 'event', 'controlTool', 'mapInteraction');

    // Console logs can be deleted
    console.log("UserID: " + userID);
    console.log("eventTime: " + eventTime);
    console.log("eventType: " + eventType);
    console.log("eventSequence: " + eventSequence);
    console.log("selectedOrigin: " + selectedOriginId);
    console.log("selectedDestination: " + selectedDestinationId);
    console.log("zoomLevel: " + zoomLevel);
    console.log("mapBounds: ", mapBounds);
    console.log("");

    // Increment eventSequence
    eventSequence += 1
};