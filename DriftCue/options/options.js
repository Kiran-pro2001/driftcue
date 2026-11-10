/**
 * DriftCue — Options & Settings Controller (Module 6)
 * Manages user customization for distraction domains, safe allowlists,
 * timer durations, new tab intention behavior, and data resets.
 */

// Elements
const formAddDistraction = document.getElementById("form-add-distraction");
const inputNewDistraction = document.getElementById("input-new-distraction");
const distractionChipsList = document.getElementById("distraction-chips-list");

const formAddAllowlist = document.getElementById("form-add-allowlist");
const inputNewAllowlist = document.getElementById("input-new-allowlist");
const allowlistChipsList = document.getElementById("allowlist-chips-list");

const selectDefaultDuration = document.getElementById("select-default-duration");
const toggleNewtab = document.getElementById("toggle-newtab");
const toggleSound = document.getElementById("toggle-sound");

const btnClearHistoryOptions = document.getElementById("btn-clear-history-options");
const btnResetDefaults = document.getElementById("btn-reset-defaults");
const btnCloseOptions = document.getElementById("btn-close-options");
const saveToast = document.getElementById("save-toast");

// Local Settings State
let currentSettings = {
  enableNewTabDashboard: true,
  soundEnabled: true,
  defaultDuration: 25,
  customDistractions: [],
  allowlist: []
};

let currentSessionDistractions = [];
let toastTimeout = null;

/**
 * Flash a brief "Changes saved" indicator
 */
function showSavedToast() {
  clearTimeout(toastTimeout);
  saveToast.classList.remove("hidden");
  toastTimeout = setTimeout(() => {
    saveToast.classList.add("hidden");
  }, 2000);
}

/**
 * Sanitize domain input (removes protocols, paths, trailing slashes, and www.)
 */
function cleanDomain(input) {
  if (!input) return "";
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//i, "");
  domain = domain.replace(/^www\./i, "");
  domain = domain.split("/")[0]; // Remove paths
  domain = domain.split("?")[0]; // Remove query params
  domain = domain.split(":")[0]; // Remove ports
  return domain;
}

/**
 * Render Chips List
 */
function renderChips(container, domains, onRemove) {
  container.innerHTML = "";
  if (!domains || domains.length === 0) {
    container.innerHTML = `<span style="font-size:12px; color:#6b7280; font-style:italic;">No domains listed yet.</span>`;
    return;
  }

  domains.forEach((dom) => {
    const chip = document.createElement("span");
    chip.className = "domain-chip";
    chip.innerHTML = `
      <span>${escapeHtml(dom)}</span>
      <button type="button" class="chip-remove" title="Remove ${escapeHtml(dom)}">×</button>
    `;

    chip.querySelector(".chip-remove").addEventListener("click", () => {
      onRemove(dom);
    });

    container.appendChild(chip);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

/**
 * Save Settings updates to Background Worker
 */
function saveSettings(updates) {
  currentSettings = { ...currentSettings, ...updates };
  chrome.runtime.sendMessage(
    {
      type: "UPDATE_SETTINGS",
      payload: updates
    },
    (res) => {
      if (res && res.success) {
        showSavedToast();
      }
    }
  );
}

/**
 * Load Initial Settings & Distractions
 */
function loadState() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
    if (!res || !res.success) return;

    currentSettings = res.settings || currentSettings;
    currentSessionDistractions = res.session?.distractionDomains || [];

    // Combine session distractions and custom distractions
    const allDistractions = Array.from(
      new Set([...currentSessionDistractions, ...(currentSettings.customDistractions || [])])
    );

    // Render Distraction Chips
    renderChips(distractionChipsList, allDistractions, (domToRemove) => {
      // Remove from customDistractions and session distractions
      const updatedCustom = (currentSettings.customDistractions || []).filter((d) => d !== domToRemove);
      const updatedSession = currentSessionDistractions.filter((d) => d !== domToRemove);
      currentSessionDistractions = updatedSession;

      saveSettings({ customDistractions: updatedCustom });
      loadState();
    });

    // Render Allowlist Chips
    renderChips(allowlistChipsList, currentSettings.allowlist || [], (domToRemove) => {
      const updatedAllowlist = (currentSettings.allowlist || []).filter((d) => d !== domToRemove);
      saveSettings({ allowlist: updatedAllowlist });
      loadState();
    });

    // Preference inputs
    selectDefaultDuration.value = String(currentSettings.defaultDuration || 25);
    toggleNewtab.checked = currentSettings.enableNewTabDashboard !== false;
    toggleSound.checked = currentSettings.soundEnabled !== false;
  });
}

/**
 * Event Handlers
 */

// Add new distraction domain
formAddDistraction.addEventListener("submit", (e) => {
  e.preventDefault();
  const domain = cleanDomain(inputNewDistraction.value);
  if (!domain) return;

  const currentCustom = currentSettings.customDistractions || [];
  if (!currentCustom.includes(domain)) {
    const updatedCustom = [...currentCustom, domain];
    saveSettings({ customDistractions: updatedCustom });
    inputNewDistraction.value = "";
    loadState();
  } else {
    inputNewDistraction.value = "";
  }
});

// Add new allowlist safe domain
formAddAllowlist.addEventListener("submit", (e) => {
  e.preventDefault();
  const domain = cleanDomain(inputNewAllowlist.value);
  if (!domain) return;

  const currentAllow = currentSettings.allowlist || [];
  if (!currentAllow.includes(domain)) {
    const updatedAllow = [...currentAllow, domain];
    saveSettings({ allowlist: updatedAllow });
    inputNewAllowlist.value = "";
    loadState();
  } else {
    inputNewAllowlist.value = "";
  }
});

// Duration change
selectDefaultDuration.addEventListener("change", (e) => {
  saveSettings({ defaultDuration: parseInt(e.target.value, 10) });
});

// New Tab toggle change
toggleNewtab.addEventListener("change", (e) => {
  saveSettings({ enableNewTabDashboard: e.target.checked });
});

// Sound toggle change
toggleSound.addEventListener("change", (e) => {
  saveSettings({ soundEnabled: e.target.checked });
});

// Clear session history
btnClearHistoryOptions.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all completed session history?")) {
    chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" }, () => {
      showSavedToast();
      alert("Session history cleared.");
    });
  }
});

// Close Settings & Return to New Tab
btnCloseOptions.addEventListener("click", () => {
  window.location.href = chrome.runtime.getURL("newtab/newtab.html");
});

// Reset Everything to Default
btnResetDefaults.addEventListener("click", () => {
  if (confirm("Reset all DriftCue settings, distractions, and preferences to original defaults?")) {
    chrome.storage.local.clear(() => {
      chrome.runtime.sendMessage({ type: "GET_STATE" }, () => {
        window.location.reload();
      });
    });
  }
});

// Initialize on page load
loadState();
