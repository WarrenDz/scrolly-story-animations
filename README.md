# Scroll story animations
**Scrolly story animations** is an experimental toolkit for enhancing script-embedded ArcGIS StoryMaps with smooth, sccroll-driven [map choreography](https://www.esri.com/arcgis-blog/products/arcgis-storymaps/mapping/choreograph-your-maps-with-arcgis-storymaps). It provides JavaScript functions that interpolate between keyframes — such as camera positions, zoom levels, and layer visibility — to create dynamic storytelling experiences.

# Getting Started
1. Clone the repository
1. Open the demo (see 'Deployments')
1. Explore the scripts

# How it Works
The system is composed of modular scripts that work together to track scroll progress and animate an embedded map within a script-embedded story. 

## Scroll Tracking and Slide Synchronization
`scrollListener.js` - Tracks user's scroll behaviour and sends progress updates to the map embedded in the story's iframe.
- Detects docking state of the StoryMap container.
- Tracks current slide via iframe src mutations.
- Calculates scroll progress within narrative panels.
- Sends updates via postMessage.

## Animation Orchestration
`mapAnimator.js` Receives messages from the scroll listener and triggers animations based on the scroll progress and 'keyframes' defined in the choreography data.
- Loads choreography JSON defining keyframes.
- Listens for scroll and hash-based events.
- Triggers viewpoint and time slider animations.
- Configures ArcGIS time slider.

## Scroll-Based Animation
`scrollAnimator.js` This module defines how map animations behave during scroll events. It receives slide data and progress values, then interpolates between keyframes to create fluid transitions.
- Dynamically maps slide keys (like viewpoint and timeSlider) to animation handlers.
- Interpolates between current and next slide states based on scroll progress.
- Applies animated transitions to the map view and time slider.

## Slide-Based Animation
`slideAnimator.js` This module handles discrete transitions when the slide index changes (e.g., via hash navigation or scroll threshold). Unlike scrollAnimator.js, which interpolates between states, this script applies the state defined in the choreography.
- Applies static viewpoint and time slider settings.
- Updates layer visibility based on slide configuration.
- Reconfigures track renderers for animated layers.
- Skips certain transitions when embedded to avoid redundant updates.

> [!NOTE]
> Slide-based animation also serves as a fallback in the event the map is viewed outside the script-embedded story.

# Usage
To build your own scrolly-driven StoryMap animation using this toolkit, follow these key steps:

## 1. Create Your ArcGIS StoryMap
- In the StoryMap settings, enable advanced embedding to allow script-based integration.
- Add your domain to the allowed domains list so the StoryMap can be embedded.

## 2. Publish a Web Map
- Create and publish an ArcGIS Web Map containing all the layers you plan to animate
- Ensure the map is publicly accessible or shared appropriately within your organization.
- Note the map’s `itemId` — you’ll need it for configuration.

## 3. Embed the Map in your Story
- Use a sidecar immersive block in your story.
- Embed the map use a `#0` index in the URL fragment (ex. `https://...#0`) to identify the first slide.
- Ensure each slide in the sidecar corresponds to a step in your choreography.
- Determine the node identifier (ex. `#n-ABC12`)for the sidecar immersive.

## 4. Define your Choreography
- Create or modify the `mapChoreography.json` file containing a list of slide objects.
- Each slide should define some combination of:
  - `viewpoint` - camera position, scale, rotation
  - `timeSlider` - time extent, step size, unit
  - `layerVisibility` - layer names to show/hide
  - `trackRenderer` - renderer settings for animated tracks

## 5. Configure `map/index.html`
- In the `<arcgis-map> tag, set the `itemId` to reference your published Web Map.
- The map acts as the "actor" performing all the choreography defined in your JSON.

## 6. Configure `animationConfig.js`
- Set the following values:
  - `storyId` - the `itemId` to reference your story.
  - `nodeSelector` - the node identifying the sidecar immersive block within your story.
  - `choreographyPath` - the relative path to your `mapChoreography.json` file.

# Requirements
To use Scrolly Story Animations, your ArcGIS StoryMap must be embedded using the [script-embed workflow](https://www.esri.com/arcgis-blog/products/arcgis-storymaps/constituent-engagement/introducing-story-embeds-via-script). This approach allows the animation system to communicate with the StoryMap via postMessage and MutationObservers.

## Story Embed Integration
This project relies on the ArcGIS StoryMaps embed workflow, which allows authors to embed a ArcGIS StoryMap using a `<script>` tag instead of a standard `<iframe>`. This method enables deeper customization and two-way communication between your webpage and the StoryMap.
- The story must be published with advanced embedding enabled.
- You must configure at least one allowed domain in the story settings.
- Define a global storyMapsEmbedConfig object before the script tag loads.