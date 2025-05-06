// ============================================================================================
// Canyoning Web Map
// Author: Oliver Revis
// File Created: `
// Last Update: 06/05/25
// ============================================================================================


// ============================================================================================
// Map Initialization & Configuration
// ============================================================================================

var map = L.map('map');

// Create custom panes for layer hierarchy
map.createPane("regionsPane"); // Background (Canyon Regions)
map.createPane("pinsPane");    // Foreground (Canyon Pins)

// Set z-index values (higher index = appears on top)
map.getPane("regionsPane").style.zIndex = 300;
map.getPane("pinsPane").style.zIndex = 400;


// ============================================================================================
// Base Map Layers
// ============================================================================================

// NSW Topographic Map
var nswTopo = L.tileLayer('https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '&copy; NSW Spatial Services'
});

// NSW Aerial Imagery Map
var nswAerial = L.tileLayer('https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '&copy; NSW Spatial Services'
});

// Set default base layer
nswTopo.addTo(map);


// ============================================================================================
// Utility Functions & Event Handlers
// ============================================================================================

// --------------------------------------
// Calculate Pin Radius Based on Zoom
// --------------------------------------
function getPinRadius(zoomLevel) {
    const minZoom = 12;
    const maxZoom = 16;
    const minRadius = 3;  // radius at minZoom (zoomLevel 12)
    const maxRadius = 6;  // radius at maxZoom (zoomLevel 16)
  
    // If zoom is below or equal to minZoom, return minRadius.
    if (zoomLevel <= minZoom) return minRadius;
  
    // If zoom is above or equal to maxZoom, return maxRadius.
    if (zoomLevel >= maxZoom) return maxRadius;
  
    // Calculate the fraction between minZoom and maxZoom.
    let fraction = (zoomLevel - minZoom) / (maxZoom - minZoom);
  
    // Linearly interpolate between minRadius and maxRadius.
    let radius = minRadius + fraction * (maxRadius - minRadius);
    return radius;
}

// --------------------------------------
// Calculate Region Fill Opacity Based on Zoom
// --------------------------------------
function getRegionFillOpacity(zoomLevel) {
    let minZoom = 3;
    let maxZoom = 13;
    let minOpacity = 0;  // Fully transparent at max zoom
    let maxOpacity = 0.8; // Fully opaque at min zoom

    // Linearly interpolate opacity based on the zoom level
    let opacity = ((maxOpacity - minOpacity) / (minZoom - maxZoom)) * 
                  (zoomLevel - maxZoom);

    return Math.max(minOpacity, Math.min(maxOpacity, opacity));
}

// --------------------------------------
// Canyon Pin Click Handler
// --------------------------------------
function onCanyonClick(feature, layer) {
    // Store the ID globally
    selectedFeatureId = feature.properties.ID;
  
    // Populate the sidebar with feature properties
    populateCanyonSidebar(feature.properties);
    showCanyonPanel(); // Open the sidebar panel
}


// ============================================================================================
// Data Layers
// ============================================================================================

// --------------------------------------
// Canyon Regions Layer (GeoJSON Data)
// --------------------------------------
var canyonRegions = omnivore.geojson(
    "https://raw.githubusercontent.com/Blakey4/Canyoning-Map/refs/heads/main/Canyon%20Area%20Boundaries.geojson",
    null, 
    L.geoJson(null, {
        pane: "regionsPane",
        style: function(feature) {
            return {
                color: "#C93535",       // Outline color
                weight: 2,              // Outline width
                opacity: 1,             // Outline opacity
                fillColor: "#C93535",   // Fill color
                fillOpacity: getRegionFillOpacity(map.getZoom()) // Dynamic fill opacity
            };
        },
        onEachFeature: function(feature, layer) {
            // Assuming your region name is stored in a property called "name"
            if (feature.properties && feature.properties["name"]) {
                layer.bindTooltip(feature.properties["name"], {
                    permanent: true,   // Keeps the tooltip visible at all times
                    direction: 'center', // Positions the label in the center of the feature
                    className: 'region-label' // Optional: a CSS class for custom styling
                });
            }
        }
    })
).addTo(map);

// --------------------------------------
// Canyon Pins Layer (CSV Data)
// --------------------------------------

// Declare global variable to store selected feature's ID
let selectedFeatureId = null;

var canyonPins = omnivore.csv('https://raw.githubusercontent.com/Blakey4/Canyoning-Map/refs/heads/main/CanyonPins.csv',
    null, 
    L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                pane: "pinsPane",
                radius: 6,          // Size of the circle marker
                fillColor: "#2674BA", // Fill color (inside)
                color: "#2674BA",    // Outline color (border)
                weight: 2,          // Border thickness
                opacity: 1,         // Border opacity
                fillOpacity: 1      // Inside opacity
            });
        },
        onEachFeature: function(feature, layer) {
            layer.on("click", function() {
                onCanyonClick(feature, layer);
            });
        }
    })
).addTo(map);

// Once the canyon pins are loaded, adjust the map view and bind popups
canyonPins.on('ready', function() {
    // Fit the map bounds to the canyon pins
    map.fitBounds(canyonPins.getBounds());

    // Add popups with canyon details
    canyonPins.eachLayer(function(layer) {
        var props = layer.feature.properties;
        var popup = [
            `<strong>Name:</strong> ${props.Name || "N/A"}`,
            `<strong>Region:</strong> ${props["Canyon Region"] || "N/A"}`
        ].join("<br>");

        layer.bindPopup(popup);
    });
});


// ============================================================================================
// Sidebar & UI Functions
// ============================================================================================

// --------------------------------------
// Sidebar Panel Controls
// --------------------------------------
function closeCanyonPanel() {
    document.getElementById("canyon-info").classList.remove("open"); // Move panel off-screen
}

function showCanyonPanel() {
    document.getElementById("canyon-info").classList.add("open"); // Slide in
}

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("close-panel").addEventListener("click", closeCanyonPanel);
    map.on("click", closeCanyonPanel);
});

// --------------------------------------
// Edit-Save Button for Sidebar
// --------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('edit-save-btn');
    if (!button) {
        console.error("Edit-Save button not found!");
        return;
    }
  
    button.addEventListener('click', function() {
        // Select all textareas in the description and attributes containers.
        const textareas = document.querySelectorAll('.description-container textarea, .attributes-container textarea');
  
        if (button.innerText.trim() === 'Edit') {
            // Switch to edit mode: remove readonly attribute from textareas.
            textareas.forEach(function(textarea) {
                textarea.hremoveAttribute("readonly");
            });
            button.innerText = "Save";
        } else {
            // Save mode: set all textareas to readonly.
            textareas.forEach(function(textarea) {
                textarea.setAttribute("readonly", "true");
            });
  
            // Switch the button text back to "Edit"
            button.innerText = "Edit";
  
            // ---- Collect Updated Values ----
            // Get updated description from its textarea.
            const updatedDescription = document.getElementById("canyon-description").value;
  
            // For attributes from the dynamic table:
            // Each attribute textarea has an ID like 'attr-value-<attributeName>'
            const attributeTextAreas = document.querySelectorAll('[id^="attr-value-"]');
            let updates = {};
            attributeTextAreas.forEach(textarea => {
                // Extract the attribute key by removing the "attr-value-" prefix.
                const key = textarea.id.substring("attr-value-".length);
                updates[key] = textarea.value;
            });
  
            // ---- Update the In-Memory GeoJSON Layer ----
            // Loop through the canyonPins layer and update the feature whose ID matches selectedFeatureId.
            canyonPins.eachLayer(function(layer) {
                if (layer.feature && layer.feature.properties && layer.feature.properties.ID == selectedFeatureId) {
                    // Update main properties.
                    if (updates["Name"]) {
                        layer.feature.properties.Name = updates["Name"];
                    }
                    layer.feature.properties.Description = updatedDescription;
  
                    // Update all other attribute properties.
                    for (let key in updates) {
                        layer.feature.properties[key] = updates[key];
                    }
  
                    // Update the popup to only show Name and Canyon Region.
                    let canyonRegion = layer.feature.properties["Canyon Region"] || "N/A";
                    let updatedName = layer.feature.properties.Name || "N/A"; // get updated name from attributes
                    let popupContent = `<strong>Name:</strong> ${updatedName}<br><strong>Canyon Region:</strong> ${canyonRegion}`;
                    layer.bindPopup(popupContent);
                }
            });
  
            console.log("In-memory GeoJSON updated with new values.");
        }
    });
});
  
// --------------------------------------
// Populate Sidebar with Canyon Data
// --------------------------------------
function populateCanyonSidebar(properties) {
    // Update the canyon's main details:
    document.getElementById("canyon-name").innerText = properties.Name || "Unknown Canyon";
    document.getElementById("canyon-description").value = properties.Description || "";
    // Canyon Image (if available, otherwise use a placeholder)
    document.getElementById("canyon-image").src = properties.Image || "placeholder.jpg";

    // Dynamically populate the attribute table
    const tableBody = document.getElementById("attributes-table-body");
    tableBody.innerHTML = ""; // Clear previous rows

    // Loop through the properties and create rows for each attribute
    for (let key in properties) {
        if (properties.hasOwnProperty(key)) {
            // Skips the ones already updated above
            if (key === "Description" || key === "Image" || key == "ID") continue;

            // Create new row in table
            const row = document.createElement("tr");

            // Create the attribute name cell (left column)
            const nameCell = document.createElement("td");
            const nameCellText = document.createElement("textarea");
            nameCellText.value = key;
            nameCellText.readOnly = true; // Initially readonly
            nameCell.appendChild(nameCellText);

            // Create the attribute value cell (right column)
            const valueCell = document.createElement("td");
            const valueCellText = document.createElement("textarea");
            valueCellText.value = properties[key];
            valueCellText.readOnly = true;
            // Assign an ID for the attribute value for later updates
            valueCellText.id = `attr-value-${key}`;
            valueCell.appendChild(valueCellText);

            // Append both cells to the row and add row to the table body
            row.appendChild(nameCell);
            row.appendChild(valueCell);
            tableBody.appendChild(row);
        }
    }
}


// ============================================================================================
// Dynamic Map Updates
// ============================================================================================

// --------------------------------------
// Update Map Elements on Zoom
// --------------------------------------
function updateZoomDependentElements() {
    let currentZoom = map.getZoom();

    // Update fill opacity for all canyon region polygons
    canyonRegions.eachLayer(function(layer) {
        layer.setStyle({
            fillOpacity: getRegionFillOpacity(currentZoom)
        });
        // Hide region labels at zoom below 10
        let tooltip = layer.getTooltip();
        if (tooltip && tooltip._container) {
            tooltip._container.style.display = (currentZoom < 10) ? "none" : "block";
        }
    });

    // Update Canyon Pin Size & Opacity on Zoom
    canyonPins.eachLayer(function(layer) {
        layer.setStyle({
            radius: getPinRadius(currentZoom),
            fillOpacity: currentZoom <= 10 ? 0 : 1,
            opacity: currentZoom <= 10 ? 0 : 1
        });
    });
}

// --------------------------------------
// Zoom Level Display
// --------------------------------------
function updateZoomDisplay() {
    let currentZoom = map.getZoom();
    document.getElementById("zoom-level-display").innerText = `Zoom: ${currentZoom}`;
}

// Run on page load to display the initial zoom level
updateZoomDisplay();

// Update zoom level display and dynamic elements on zoom changes
map.on("zoomend", updateZoomDisplay);
map.on("zoomend", updateZoomDependentElements);


// ============================================================================================
// Layer Controls
// ============================================================================================

var baseMaps = {
    "NSW Topo - SixMaps": nswTopo,
    "NSW Aerial Imagery": nswAerial
};

var overlayMaps = {
    "Canyon Pins": canyonPins,
    "Canyoning Region": canyonRegions
};

var layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);
