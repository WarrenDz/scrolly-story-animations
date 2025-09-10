// Imports
import { animationConfig } from "../../src/config/animationConfig.js";
import { scrollAnimation } from "../../src/animators/scrollAnimator.js";
import { slideAnimation } from "../../src/animators/slideAnimator.js";

let mapView = null;
let isEmbedded = false; // Flag to indicate if the map is viewed in an embedded context

// Define the map components
const mapElement = document.querySelector("arcgis-map");
mapElement.setAttribute("item-id", animationConfig.mapId);
mapElement.setAttribute("zoom", animationConfig.mapZoom);
mapElement.setAttribute("center", animationConfig.mapCenter);
const timeSlider = document.querySelector("arcgis-time-slider");

// Set DEBUG to true to enable debug logging
const DEBUG = animationConfig.debugMode;
function log(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

/**
 * Load choreography data from the specified JSON file path,
 * parses it, and stores the result in choreographyData.
 */
let choreographyData = [];
async function loadChoreography(path) {
  try {
    const response = await fetch(path);
    choreographyData = await response.json();
    log("Loaded data");
  } catch (error) {
    console.error("Failed to load choreography:", error);
  }
}

/**
 * Listen for postMessage events from the "storymap-controller" to coordinate map animations.
 * Determines whether the map is embedded and sets up hash animation if not.
 * Triggers scroll-based animations based on slide progress and static slide updates
 * when the slide index changes.
 */
let lastSlideIndex = null;

function setupMessageListener() {
  window.addEventListener("message", (event) => {
    if (event.data.source !== "storymap-controller") return;

    const payload = event.data.payload;

    if (payload.isEmbedded) {
      // log("This story is being viewed via script embed - deferring to scroll animation.");
      isEmbedded = true;
    } else {
      // log("Map is not embedded — enabling hash-based navigation.");
      isEmbedded = false;
    }

    const currentSlide = choreographyData[payload.slide];
    const nextSlide = choreographyData[payload.slide + 1];

    // Scroll-based animation
    scrollAnimation(currentSlide, nextSlide, payload.progress, mapView, timeSlider);

    // Slide change detection
    if (payload.slide !== lastSlideIndex) {
      lastSlideIndex = payload.slide;
      slideAnimation(currentSlide, mapView, timeSlider, isEmbedded); // using isEmbedded to mute some property changes when viewed in embed
    }
  });
}

/**
 * Listen for changes in the URL hash and triggers slide animation
 * based on the corresponding index in choreographyData.
 */
function setupHashListener() {
  window.addEventListener("hashchange", function () {
    log("Hash changed to: " + window.location.hash);
    const hashIndex = parseInt(window.location.hash.substring(1), 10);

    if (isNaN(hashIndex) || !choreographyData[hashIndex]) {
      log("No valid hash index found.");
      return;
    }

    const currentSlide = choreographyData[hashIndex];
    slideAnimation(currentSlide, mapView, timeSlider, isEmbedded);
  });
}

/**
 * Initialize the timeSlider using configuration from the first slide in choreographyData.
 * Sets the full time extent, interval stops, and starting frame.
 * Automatically starts playback if the slider is ready and not in embedded mode.
 */
function configureTimeSlider() {
  const slideData = choreographyData[0];
  if ( timeSlider && slideData.timeSlider && slideData.timeSlider.timeSliderStart && slideData.timeSlider.timeSliderEnd ) {
    const timeStart = slideData.timeSlider.timeSliderStart;
    const timeEnd = slideData.timeSlider.timeSliderEnd;
    const timeUnit = slideData.timeSlider.timeSliderUnit;
    const timeStep = slideData.timeSlider.timeSliderStep;
    const startFrame = new Date(timeStart);
    const endFrame = new Date(timeEnd);

    // Configure time extent
    log("Configuring time slider:", { start: startFrame, end: endFrame, timeUnit: timeUnit, timeStep: timeStep});
    timeSlider.fullTimeExtent = { start: startFrame, end: endFrame };
    timeSlider.timeExtent = { start: null, end: startFrame };

    // Set the time slider interval based on choreography
    timeSlider.stops = {
      interval: {
        value: timeStep,
        unit: timeUnit,
      },
    };

    // Start the time slider if not already playing and if outside script embed story
    if (timeSlider.state === "ready" && !isEmbedded) {
      timeSlider.play();
    }
  } else if (!timeSlider) {
    log("No timeSlider component found.");
  } else {
    log("No timeSlider configuration found in choreography.");
  }
}

/**
 * Initialize the map animation system by loading choreography data,
 * setting up message listeners, and configuring the time slider.
 */
async function initMapAnimator(choreographyPath) {
  await loadChoreography(choreographyPath);
  setupMessageListener();
  setupHashListener()
  configureTimeSlider();
}

/**
 * Wait for the ArcGIS map view to become ready, then initializes the map animator
 * using the choreography configuration path.
 */
mapElement.addEventListener("arcgisViewReadyChange", async (event) => {
  if (!event.target.ready) return;
  mapView = mapElement.view;
  // Disable map navigation
  if (animationConfig.disableMapNav) {
    mapView.on("mouse-wheel", (event) => {
      event.stopPropagation();
    });
    mapView.on("drag", (event) => {
      event.stopPropagation();
    });
  }
  initMapAnimator(animationConfig.choreographyPath);
});
