const Viewpoint = await $arcgis.import("@arcgis/core/Viewpoint.js");

/**
 * Maps slide data keys to their corresponding animation handler functions,
 * enabling dynamic choreography of viewpoint and time slider transitions.
 */
const choreographyHandlers = {
  viewpoint: toggleViewpoint,
  timeSlider: toggleTimeSlider,
  layerVisibility: toggleLayerVisibility,
  trackRenderer: toggleTrackRenderer,
};

/**
 * Executes animation handlers for each key in slideData using shared context.
 * Skips keys listed in NON_EMBED_EXCLUDE_KEYS when in embedded mode.
 * Logs each triggered animation and catches any handler errors.
 */
const NON_EMBED_EXCLUDE_KEYS = new Set(["viewpoint", "timeSlider"]);

export function slideAnimation(slideData, mapView, timeSlider, embedded) {
  const context = { slideData, mapView, timeSlider, embedded };

  Object.entries(slideData).forEach(([key, value]) => {
    const handler = choreographyHandlers[key];
    if (!handler) return;

    // Skip excluded keys when not embedded
    if (embedded && NON_EMBED_EXCLUDE_KEYS.has(key)) return;

    try {
      handler(context);
    } catch (error) {
      console.error(`Error processing '${key}':`, error);
    }
  });
}

/**
 * Sets the map view to the viewpoint defined in slideData,
 * animating the transition over 1 second. Logs errors if the transition fails.
 */
function toggleViewpoint({ slideData, mapView, timeSlider, embedded }) {
  const targetViewpoint = Viewpoint.fromJSON(slideData.viewpoint);
  mapView.goTo(targetViewpoint, {
      animate: true,
      duration: 1000,
    })
    .catch((error) => {
      console.error("Error setting viewpoint:", error);
    });
}

function toggleTimeSlider({ slideData, mapView, timeSlider, embedded }) {
  // logic here to set teh time slider and autoplay
}


/**
 * Updates map layer visibility based on slideData configuration.
 * Turns on layers listed in layersOn and turns off layers listed in layersOff
 * by matching layer titles in the mapView.
 */
function toggleLayerVisibility({ slideData, mapView, timeSlider, embedded }) {
  const mapLayers = mapView.map.layers;
  function setLayerVisibility(layerNames, visibility) {
    if (layerNames && layerNames.length > 0) {
      mapLayers.forEach((mapLayer) => {
        if (layerNames.includes(mapLayer.title)) {
          mapLayer.visible = visibility; // Set visibility based on the argument
        }
      });
    }
  }
  const layersOn = slideData.layerVisibility.layersOn;
  const layersOff = slideData.layerVisibility.layersOff;

  setLayerVisibility(layersOn, true); // Turn on specified layers
  setLayerVisibility(layersOff, false); // Turn off specified layers
}

/**
 * Reconfigures and reapplies a track renderer to its corresponding map layer
 * using parameters from slideData and timeSlider. Performs a hard reset by
 * removing and re-adding the layer, then updates its timeInfo and trackInfo.
 * Ensures the layer is visible.
 */
function toggleTrackRenderer({ slideData, mapView, timeSlider, embedded }) {
  const mapLayers = mapView.map.layers;
  const trackTimeConfig = slideData.timeSlider;
  async function applyTrackRenderer(trackRenderer, timeSlider) {
    try {
      const trackLayerField = trackRenderer.trackFieldName;
      const trackTimeSliderUnit = timeSlider.timeSliderUnit;
      const trackTimeSliderStep = timeSlider.timeSliderStep;
      let trackLayer = mapLayers.find(
        (layer) => layer.title === trackRenderer.trackLayerName
      );
      if (trackLayer) {
        // these are an attempt to do a hard reset on the renderer when we switch hashes
        try {
          mapView.map.remove(trackLayer);
        } catch (error) {
          console.error("Failed to remove track layer:", error);
        }
        trackLayer = trackLayer.clone();
        try {
          mapView.map.add(trackLayer);
        } catch (error) {
          console.error("Failed to add track layer:", error);
        }
        console.log("Applying track renderer:", trackRenderer.trackLayerName);
        await trackLayer.when(); // Wait for the layer to load
        const trackStartField = trackLayer.timeInfo.startField;
        trackLayer.visible = true; // Make the layer visible
        trackLayer.timeInfo = {
          startField: trackStartField,
          trackIdField: trackLayerField,
          interval: {
            unit: trackTimeSliderUnit,
            value: trackTimeSliderStep,
          },
        };
        // Apply renderer from choreography data
        trackLayer.trackInfo = trackRenderer.trackInfo;
      }
    } catch (error) {
      console.error("Failed to set track Renderer:", error);
    }
  }
  applyTrackRenderer(slideData.trackRenderer, trackTimeConfig);
}
