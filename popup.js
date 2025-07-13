// popup.js

// --- DOM Element References ---
const fgColorPicker = document.getElementById("fg-color-picker");
const fgHexInput = document.getElementById("fg-hex-input");
const fgSwatch = document.getElementById("fg-swatch");

const bgColorPicker = document.getElementById("bg-color-picker");
const bgHexInput = document.getElementById("bg-hex-input");
const bgSwatch = document.getElementById("bg-swatch");

const swapBtn = document.getElementById("swap-btn");
const contrastRatioEl = document.getElementById("contrast-ratio");

const aaNormalResultEl = document.getElementById("aa-normal-result");
const aaLargeResultEl = document.getElementById("aa-large-result");
const aaaNormalResultEl = document.getElementById("aaa-normal-result");
const aaaLargeResultEl = document.getElementById("aaa-large-result");

const analyzerTabBtn = document.getElementById("analyzer-tab-btn");
const aboutTabBtn = document.getElementById("about-tab-btn");
const analyzerPanel = document.getElementById("analyzer-panel");
const aboutPanel = document.getElementById("about-panel");

const errorContainer = document.getElementById("error-container");

// --- Core Calculation Functions ---
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getLuminance(rgb) {
  const a = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(rgb1, rgb2) {
  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function createResultHtml(didPass, text) {
  const passIcon = `<span class="text-green-500"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg></span>`;
  const failIcon = `<span class="text-red-500"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg></span>`;
  return `<span class="text-sm text-gray-600">${text}</span> ${
    didPass ? passIcon : failIcon
  }`;
}

// --- UI Update Function ---
function updateContrastUI() {
  const fgHex = fgHexInput.value;
  const bgHex = bgHexInput.value;

  fgSwatch.style.backgroundColor = fgHex;
  fgColorPicker.value = fgHex;
  bgSwatch.style.backgroundColor = bgHex;
  bgColorPicker.value = bgHex;

  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);

  if (!fgRgb || !bgRgb) {
    contrastRatioEl.textContent = "Invalid";
    return;
  }

  const ratio = getContrastRatio(fgRgb, bgRgb);
  contrastRatioEl.textContent = `${ratio.toFixed(2)}:1`;

  aaNormalResultEl.innerHTML = createResultHtml(ratio >= 4.5, "Normal");
  aaLargeResultEl.innerHTML = createResultHtml(ratio >= 3, "Large");
  aaaNormalResultEl.innerHTML = createResultHtml(ratio >= 7, "Normal");
  aaaLargeResultEl.innerHTML = createResultHtml(ratio >= 4.5, "Large");
}

// --- State Management & Initialization ---
function updateAndStoreColors(fg, bg) {
  const newColors = {};
  if (fg !== null) newColors.fgColor = fg.toUpperCase();
  if (bg !== null) newColors.bgColor = bg.toUpperCase();

  chrome.storage.local.set(newColors, () => {
    if (chrome.runtime.lastError) {
      console.error(`Error setting color: ${chrome.runtime.lastError.message}`);
      errorContainer.textContent =
        "Could not save color. Please check extension permissions.";
      errorContainer.classList.remove("hidden");
    }
  });
}

function initializeState() {
  chrome.storage.local.get(["fgColor", "bgColor"], (result) => {
    if (chrome.runtime.lastError) {
      console.error(
        `Error getting colors: ${chrome.runtime.lastError.message}`
      );
      errorContainer.textContent =
        "Could not load saved colors. Please check extension permissions.";
      errorContainer.classList.remove("hidden");
      fgHexInput.value = "#333333";
      bgHexInput.value = "#FFFFFF";
    } else {
      fgHexInput.value = result.fgColor || "#333333";
      bgHexInput.value = result.bgColor || "#FFFFFF";
    }
    updateContrastUI();
  });
}

// --- Event Listeners ---
fgColorPicker.addEventListener("input", (e) =>
  updateAndStoreColors(e.target.value, null)
);
bgColorPicker.addEventListener("input", (e) =>
  updateAndStoreColors(null, e.target.value)
);

fgHexInput.addEventListener("input", (e) => {
  if (/^#?[0-9A-F]{6}$/i.test(e.target.value)) {
    updateAndStoreColors(e.target.value, null);
  }
});
bgHexInput.addEventListener("input", (e) => {
  if (/^#?[0-9A-F]{6}$/i.test(e.target.value)) {
    updateAndStoreColors(null, e.target.value);
  }
});

swapBtn.addEventListener("click", () => {
  const tempFg = fgHexInput.value;
  const tempBg = bgHexInput.value;
  updateAndStoreColors(tempBg, tempFg);
});

// --- Extension-Specific Logic ---
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    let needsUpdate = false;
    if (changes.fgColor) {
      fgHexInput.value = changes.fgColor.newValue.toUpperCase();
      needsUpdate = true;
    }
    if (changes.bgColor) {
      bgHexInput.value = changes.bgColor.newValue.toUpperCase();
      needsUpdate = true;
    }
    if (needsUpdate) {
      updateContrastUI();
    }
  }
});

// --- Tab Logic ---
function switchTab(e) {
  const clickedTab = e.currentTarget;
  [analyzerTabBtn, aboutTabBtn].forEach((btn) =>
    btn.classList.remove("active")
  );
  [analyzerPanel, aboutPanel].forEach((panel) =>
    panel.classList.remove("active")
  );
  clickedTab.classList.add("active");
  if (clickedTab === analyzerTabBtn) {
    analyzerPanel.classList.add("active");
  } else {
    aboutPanel.classList.add("active");
  }
}

analyzerTabBtn.addEventListener("click", switchTab);
aboutTabBtn.addEventListener("click", switchTab);

// --- Initial Setup ---
document.addEventListener("DOMContentLoaded", initializeState);