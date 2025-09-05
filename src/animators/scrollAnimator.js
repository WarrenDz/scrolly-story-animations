const Viewpoint = await $arcgis.import("@arcgis/core/Viewpoint.js");

/**
 * Maps slide data keys to their corresponding animation handler functions,
 * enabling dynamic choreography of viewpoint and time slider transitions.
 */
const choreographyHandlers = {
  viewpoint: interpolateViewpoint,
  timeSlider: interpolateTimeSlider
};

/**
 * Executes animation handlers for each key (defined above) in the current slide,
 * passing shared context including progress and map state.
 * Used to animate transitions between slides during scroll events.
 */
export function scrollAnimation(slideCurrent, slideNext, progress, mapView, timeSlider) {
  const context = { slideCurrent, slideNext, progress, mapView, timeSlider };
  Object.keys(slideCurrent)
    .filter(key => typeof choreographyHandlers[key] === "function")
    .forEach(key => {
      try {
        choreographyHandlers[key](context);
      } catch (error) {
        console.error(`Error processing '${key}':`, error);
      }
    });
}

/**
 * Smoothly interpolates between two slide viewpoints based on progress (0–1),
 * generating a transitional camera view with updated rotation, scale, and geometry.
 * Applies the interpolated viewpoint to the mapView with animation.
 */
function interpolateViewpoint({ slideCurrent, slideNext, progress, mapView, timeSlider }) {
  const currentViewpoint = slideCurrent.viewpoint;
  const nextViewpoint = slideNext?.viewpoint;

  // If next viewpoint is missing, skip interpolation and use current viewpoint directly
  if (!nextViewpoint) return;

  const interpolate = (fromVal, toVal) => fromVal + (toVal - fromVal) * progress;

  const viewpoint = {
    rotation: interpolate(currentViewpoint.rotation, nextViewpoint.rotation),
    scale: interpolate(currentViewpoint.scale, nextViewpoint.scale),
    targetGeometry: {
      spatialReference: {
        latestWkid: currentViewpoint.targetGeometry.spatialReference.latestWkid,
        wkid: currentViewpoint.targetGeometry.spatialReference.wkid,
      },
      xmin: interpolate(currentViewpoint.targetGeometry.xmin, nextViewpoint.targetGeometry.xmin),
      ymin: interpolate(currentViewpoint.targetGeometry.ymin, nextViewpoint.targetGeometry.ymin),
      xmax: interpolate(currentViewpoint.targetGeometry.xmax, nextViewpoint.targetGeometry.xmax),
      ymax: interpolate(currentViewpoint.targetGeometry.ymax, nextViewpoint.targetGeometry.ymax),
    },
  };

  const targetViewpoint = Viewpoint.fromJSON(viewpoint);
  mapView.goTo(targetViewpoint, {
    animate: true,
    duration: 1000,
  }).catch((error) => {
    console.error("Error setting interpolated viewpoint:", error);
  });
}

/**
 * Interpolates between two slide time ranges based on progress (0–1),
 * snapping the result to the nearest time step and clamping it within bounds.
 * Updates the timeSlider's extent to reflect the interpolated time and stops playback.
 */
function interpolateTimeSlider({ slideCurrent, slideNext, progress, mapView, timeSlider }) {
  try {
  const slideTimeData = slideCurrent.timeSlider
  const start = new Date(slideTimeData.timeSliderStart);
  const end = new Date(slideTimeData.timeSliderEnd);
  const step = slideTimeData.timeSliderStep;
  const unit = slideTimeData.timeSliderUnit;
  const interpolate = (fromVal, toVal) => fromVal + (toVal - fromVal) * progress;
  const interpolatedTime = interpolate(start.getTime(), end.getTime());
  const unitToMs = {
    milliseconds: 1,
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000, // Approximate
    years: 365 * 24 * 60 * 60 * 1000, // Approximate
  };

  const stepMs = step * (unitToMs[unit] || 0);
  if (stepMs <= 0) return new Date(Math.min(interpolatedTime, end.getTime()));

  // Snap to step
  const offset = interpolatedTime - start.getTime();
  const snappedOffset = Math.ceil(offset / stepMs) * stepMs;
  const snappedTime = start.getTime() + snappedOffset;

  // Clamp to end
  const clampedTime = Math.min(
    Math.max(snappedTime, start.getTime()),
    end.getTime()
  );
  timeSlider.timeExtent = {
    start: null,
    end: new Date(clampedTime),
  };
  timeSlider.stop();
  } catch (error) {
    console.error("Error setting time slider:", error);
  }

}