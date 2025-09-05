import { animationConfig } from '../../src/config/animationConfig.js';

function generateScriptConfig(storyId) {
  window.storyMapsEmbedConfig = {
      storyId: storyId,
      rootNode: ".storymaps-root",
  };
}

function createScriptedEmbed() {
  const script = document.createElement('script');
  script.id = 'embed-script';
  script.src = `https://storymaps.arcgis.com/embed/view`;
  document.body.appendChild(script);
}

generateScriptConfig(animationConfig.storyId);
createScriptedEmbed();