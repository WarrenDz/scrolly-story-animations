import { animationConfig } from '../config/animationConfig.js';
// This file contains shared state variables used across the scroll-driven story map
let isDocked = false;
let dockStartScroll = null;

let lastScrollY = window.scrollY;
let scrollDirection = "down"; // or 'up';
let currentSlide = 0;


// Set DEBUG to true to enable debug logging
const DEBUG = true;

function log(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

// --- Utility Functions ---
// DOM readiness, panel height, scroll bounds...

// Waits for a specific DOM element to be available before executing a callback function.
function waitForElement(selector, callback) {
  const interval = setInterval(() => {
    const element = document.querySelector(selector);
    if (element) {
      clearInterval(interval);
      callback(element);
    }
  }, 100);
}

// Calculates the height of a narrative panel, adjusting for margins and padding based on its position (first, last, or middle).
function getPanelHeight(panel) {
  return panel.classList.contains("first")
    ? panel.offsetHeight - parseFloat(getComputedStyle(panel).marginTop)
    : panel.classList.contains("last")
    ? panel.offsetHeight - parseFloat(getComputedStyle(panel).paddingBottom)
    : panel.offsetHeight +
      parseFloat(getComputedStyle(panel).marginBottom) +
      parseFloat(getComputedStyle(panel).marginTop);
}

// Calculates the start and end scroll positions for the panel corresponding to currentSlide.
// Used to track scroll progress and triggering animations as the user scrolls
function getPanelScrollBounds(panels, currentSlide) {
  let panelStartScroll = dockStartScroll;

  for (let i = 0; i < currentSlide; i++) {
    panelStartScroll += getPanelHeight(panels[i]);
  }

  const panelHeight = getPanelHeight(panels[currentSlide]);
  const panelEndScroll = panelStartScroll + panelHeight;

  return { panelStartScroll, panelEndScroll };
}

// Calculates the progress of the current panel based on the scroll position and the panel's scroll bounds.
function getPanelProgress(panels, currentSlide, scrollY) {
  const { panelStartScroll, panelEndScroll } = getPanelScrollBounds(
    panels,
    currentSlide
  );
  let progress =
    (scrollY - panelStartScroll) / (panelEndScroll - panelStartScroll);
  return Math.max(0, Math.min(1, progress));
}

// --- Observers ---

// Creates a MutationObserver to monitor changes to the 'src' attribute of an iframe
// When the src changes it extracts a slide number from the URL fragment (after the #) and names it current slide.
const createIframeSrcObserver = (iframe) => {
  return new MutationObserver(() => {
    const newSrc = iframe.getAttribute("src") || "";
    const parts = newSrc.split("#");
    const slideNumber = parseInt(parts.length > 1 ? parts.pop() : "0", 10);
    currentSlide = isNaN(slideNumber) ? 0 : slideNumber;
    log("Updated current slide:", currentSlide);
  });
};

// Sets up a scroll listener to track the scroll direction and current scroll position.
// This is used to determine when the user scrolls down or up, which can affect the docking state.
function setupDockingObserver(nodeSelector) {
  const targetSelectorDocked = `${nodeSelector} > div > div[class*='jsx-'][class*='container'][class*='main']`;

  waitForElement(targetSelectorDocked, (target) => {
    const observer = new MutationObserver(() => {
      const currentlyDocked = target.classList.contains("docked");

      if (currentlyDocked && !isDocked) {
        isDocked = true;
        const currentScroll = window.scrollY;
        log(currentScroll, scrollDirection);

        if (scrollDirection === "down") {
          dockStartScroll = currentScroll;
        }

        log("Docked: Starting scroll tracking at", dockStartScroll);
      }

      if (!currentlyDocked && isDocked) {
        isDocked = false;
      }
    });

    observer.observe(target, { attributes: true, attributeFilter: ["class"] });
    log("Docking observer attached.");
  });
}

function watchForIframeForever(nodeSelector) {
  const iframeSelector = `${nodeSelector} iframe`;
  waitForElement(nodeSelector, (root) => {
    const observer = new MutationObserver(() => {
      const iframe = root.querySelector("iframe");
      if (iframe && !iframe.dataset.observed) {
        log(`Frame (re)found under ${nodeSelector}, attaching observer.`);
        iframe.dataset.observed = "true";
        currentSlide = 0;

        iframe.contentWindow.postMessage(
          {
            source: "storymap-controller",
            payload: { isEmbedded: true },
          },
          "*"
        );

        const srcObserver = createIframeSrcObserver(iframe);
        srcObserver.observe(iframe, {
          attributes: true,
          attributeFilter: ["src"],
        });
      }
    });

    observer.observe(root, { childList: true, subtree: true });
    log(`Watching ${nodeSelector} for iframe (re)insertion.`);
  });
}

// --- Scroll tracking ---

// Sets up a scroll listener that tracks the user's scroll position and updates the current slide's progress.
function setupScrollListener(nodeSelector) {
  const iframeSelector = `${nodeSelector} iframe`;

  window.addEventListener("scroll", () => {
    const currentScroll = window.scrollY;
    scrollDirection =
      currentScroll > lastScrollY
        ? "down"
        : currentScroll < lastScrollY
        ? "up"
        : scrollDirection;
    lastScrollY = currentScroll;

    if (!isDocked || dockStartScroll === null) return;

    const panels = document.querySelectorAll("div.immersive-narrative-panel");
    if (currentSlide < panels.length) {
      const progress = getPanelProgress(panels, currentSlide, currentScroll);
      log("Scroll: [slide", currentSlide, "], [progress:", (progress * 100).toFixed(2) + "%]")
      const iframe = document.querySelector(iframeSelector);
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            source: "storymap-controller",
            payload: {
              type: "progress",
              slide: currentSlide, 
              progress: progress,
              isEmbedded: true
            },
          },
          "*"
        );
      }
    }
  });
}

// --- Initialization ---

// Set up observers and listeners for docking, iframe changes, and scroll events.
async function createStoryScrollListener(nodeSelector) {
  setupDockingObserver(nodeSelector);
  watchForIframeForever(nodeSelector);
  setupScrollListener(nodeSelector);
}

createStoryScrollListener(animationConfig.nodeSelector)