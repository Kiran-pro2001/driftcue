/**
 * DriftCue — Popup UI Controller (Module 2 & 5)
 * Manages user interactions for starting sessions, duration picking, distraction toggling,
 * live countdown timer synchronization, pausing, ending, post-session reflection, and history logging.
 */

const DEFAULT_PRESET_DISTRACTIONS = [
  { id: "youtube", label: "YouTube", domain: "youtube.com" },
  { id: "reddit", label: "Reddit", domain: "reddit.com" },
  { id: "x", label: "X / Twitter", domain: "x.com" },
  { id: "instagram", label: "Instagram", domain: "instagram.com" },
  { id: "linkedin", label: "LinkedIn", domain: "linkedin.com" },
  { id: "tiktok", label: "TikTok", domain: "tiktok.com" }
];

// Elements - Views
const viewIdle = document.getElementById("view-idle");
const viewActive = document.getElementById("view-active");
const viewSummary = document.getElementById("view-summary");
const viewHistory = document.getElementById("view-history");
const viewSettings = document.getElementById("view-settings");

// Elements - Idle View
const inputTask = document.getElementById("input-task");
const durationPills = document.querySelectorAll(".duration-pills .pill-btn");
const inputCustomMins = document.getElementById("input-custom-mins");
const distractionPillsContainer = document.getElementById("distraction-pills");
const inputInlineDistraction = document.getElementById("input-inline-distraction");
const btnInlineAddDistraction = document.getElementById("btn-inline-add-distraction");
const btnStartFocus = document.getElementById("btn-start-focus");

// Elements - Active View
const activeTaskDisplay = document.getElementById("active-task-display");
const activeTimerText = document.getElementById("active-timer-text");
const sessionBadge = document.getElementById("session-badge");
const statInterventions = document.getElementById("stat-interventions");
const statReturned = document.getElementById("stat-returned");
const btnPauseSession = document.getElementById("btn-pause-session");
const pauseBtnIcon = document.getElementById("pause-btn-icon");
const pauseBtnLabel = document.getElementById("pause-btn-label");
const btnEndSession = document.getElementById("btn-end-session");

// Elements - Summary View
const summaryTaskName = document.getElementById("summary-task-name");
const sumActualTime = document.getElementById("sum-actual-time");
const sumDrifts = document.getElementById("sum-drifts");
const sumReturned = document.getElementById("sum-returned");
const summarySitesWrap = document.getElementById("summary-sites-wrap");
const summarySitesList = document.getElementById("summary-sites-list");
const inputSummaryNotes = document.getElementById("input-summary-notes");
const reflectionButtons = document.querySelectorAll(".btn-reflect");
const btnCloseSummary = document.getElementById("btn-close-summary");

// Elements - History View & Nav
const btnToggleHistory = document.getElementById("btn-toggle-history");
const historyList = document.getElementById("history-list");
const btnClearHistory = document.getElementById("btn-clear-history");
const btnBackFromHistory = document.getElementById("btn-back-from-history");
const btnBackFromHistoryTop = document.getElementById("btn-back-from-history-top");
const btnOpenOptions = document.getElementById("btn-open-options");

// Elements - Embedded Settings View
const btnBackFromSettings = document.getElementById("btn-back-from-settings");
const btnBackFromSettingsBottom = document.getElementById("btn-back-from-settings-bottom");
const settingsSaveToast = document.getElementById("settings-save-toast");
const formSettingsDistraction = document.getElementById("form-settings-distraction");
const inputSettingsDistraction = document.getElementById("input-settings-distraction");
const settingsDistractionChips = document.getElementById("settings-distraction-chips");
const formSettingsAllowlist = document.getElementById("form-settings-allowlist");
const inputSettingsAllowlist = document.getElementById("input-settings-allowlist");
const settingsAllowlistChips = document.getElementById("settings-allowlist-chips");
const toggleSoundSettings = document.getElementById("toggle-sound-settings");
const toggleNewtabSettings = document.getElementById("toggle-newtab-settings");
const selectDurationSettings = document.getElementById("select-duration-settings");

// Local Component State
let selectedMinutes = 25;
let customDistractionDomains = [];
let storedAllowlist = [];
let selectedDistractionDomains = new Set(DEFAULT_PRESET_DISTRACTIONS.map((d) => d.domain));
let timerInterval = null;
let currentSession = null;
let chosenReflection = "Yes";
let previousActiveView = "idle";
let settingsToastTimer = null;

/**
 * Format seconds into MM:SS
 */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Sanitize domain input (removes protocols, paths, and www.)
 */
function cleanDomain(input) {
  if (!input) return "";
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//i, "");
  domain = domain.replace(/^www\./i, "");
  domain = domain.split("/")[0];
  domain = domain.split("?")[0];
  domain = domain.split(":")[0];
  return domain;
}

/**
 * Switch active visible view (supports idle, active, summary, history, settings)
 */
function switchView(viewName) {
  if (viewName !== "history" && viewName !== "settings") {
    previousActiveView = viewName;
  }
  viewIdle.classList.add("hidden");
  viewActive.classList.add("hidden");
  viewSummary.classList.add("hidden");
  viewHistory.classList.add("hidden");
  if (viewSettings) viewSettings.classList.add("hidden");

  if (viewName === "idle") viewIdle.classList.remove("hidden");
  else if (viewName === "active") viewActive.classList.remove("hidden");
  else if (viewName === "summary") viewSummary.classList.remove("hidden");
  else if (viewName === "history") viewHistory.classList.remove("hidden");
  else if (viewName === "settings") viewSettings.classList.remove("hidden");
}

/**
 * Render distraction pills in Idle View (Presets + User Custom URLs)
 */
function renderDistractionPills() {
  distractionPillsContainer.innerHTML = "";

  // 1. Preset Distractions
  DEFAULT_PRESET_DISTRACTIONS.forEach((item) => {
    const pill = document.createElement("button");
    pill.type = "button";
    const isChecked = selectedDistractionDomains.has(item.domain);
    pill.className = `distraction-pill ${isChecked ? "checked" : ""}`;
    pill.dataset.domain = item.domain;
    pill.innerHTML = `<span class="pill-dot"></span><span>${item.label}</span>`;

    pill.addEventListener("click", () => {
      if (selectedDistractionDomains.has(item.domain)) {
        selectedDistractionDomains.delete(item.domain);
        pill.classList.remove("checked");
      } else {
        selectedDistractionDomains.add(item.domain);
        pill.classList.add("checked");
      }
    });

    distractionPillsContainer.appendChild(pill);
  });

  // 2. Custom User-Added Distractions
  customDistractionDomains.forEach((dom) => {
    const pill = document.createElement("button");
    pill.type = "button";
    const isChecked = selectedDistractionDomains.has(dom);
    pill.className = `distraction-pill custom-pill ${isChecked ? "checked" : ""}`;
    pill.dataset.domain = dom;
    pill.innerHTML = `
      <span class="pill-dot"></span>
      <span>${escapeHtml(dom)}</span>
      <span class="pill-remove-x" title="Delete ${escapeHtml(dom)}">×</span>
    `;

    pill.addEventListener("click", (e) => {
      if (e.target.classList.contains("pill-remove-x")) {
        e.stopPropagation();
        customDistractionDomains = customDistractionDomains.filter((d) => d !== dom);
        selectedDistractionDomains.delete(dom);
        chrome.runtime.sendMessage({
          type: "UPDATE_SETTINGS",
          payload: { customDistractions: customDistractionDomains }
        });
        renderDistractionPills();
        return;
      }

      if (selectedDistractionDomains.has(dom)) {
        selectedDistractionDomains.delete(dom);
        pill.classList.remove("checked");
      } else {
        selectedDistractionDomains.add(dom);
        pill.classList.add("checked");
      }
    });

    distractionPillsContainer.appendChild(pill);
  });
}

/**
 * Live Countdown Synchronization
 */
function startLiveTimer(session) {
  clearInterval(timerInterval);

  const updateDisplay = () => {
    if (!session || !session.isActive) {
      clearInterval(timerInterval);
      return;
    }

    if (session.isPaused) {
      const remainingMs = session.endTime - session.pausedAt;
      const sec = Math.max(0, Math.floor(remainingMs / 1000));
      activeTimerText.textContent = formatTime(sec);
      activeTimerText.classList.add("paused");
      return;
    }

    activeTimerText.classList.remove("paused");
    const remainingMs = session.endTime - Date.now();
    const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));

    activeTimerText.textContent = formatTime(remainingSec);

    if (remainingSec <= 0) {
      clearInterval(timerInterval);
      fetchStateAndRender(); // Session completed
    }
  };

  updateDisplay();
  timerInterval = setInterval(updateDisplay, 1000);
}

/**
 * Render Active Session View
 */
function renderActiveSession(session) {
  currentSession = session;
  activeTaskDisplay.textContent = session.task || "Deep Focus";

  if (session.isPaused) {
    sessionBadge.className = "badge badge-paused";
    sessionBadge.innerHTML = `<span class="pulse-dot"></span> Paused (Break)`;
    pauseBtnIcon.textContent = "▶";
    pauseBtnLabel.textContent = "Resume";
  } else {
    sessionBadge.className = "badge badge-focus";
    sessionBadge.innerHTML = `<span class="pulse-dot"></span> Focus Active`;
    pauseBtnIcon.textContent = "⏸";
    pauseBtnLabel.textContent = "Pause";
  }

  const metrics = session.metrics || {};
  statInterventions.textContent = metrics.interventionsCount || 0;
  statReturned.textContent = metrics.returnedToTaskCount || 0;

  startLiveTimer(session);
  switchView("active");
}

/**
 * Render Post-Session Summary View (Module 5)
 */
function renderSummary(summary) {
  clearInterval(timerInterval);
  summaryTaskName.textContent = summary.task || "Focus Session";
  sumActualTime.textContent = `${summary.actualDurationMinutes || 1}m`;
  sumDrifts.textContent = summary.metrics?.interventionsCount || 0;
  sumReturned.textContent = summary.metrics?.returnedToTaskCount || 0;

  // Render site breakdown pills
  const sites = summary.metrics?.sitesVisited || {};
  const siteEntries = Object.entries(sites);
  if (siteEntries.length > 0) {
    summarySitesWrap.classList.remove("hidden");
    summarySitesList.innerHTML = siteEntries
      .map(([domain, count]) => `<span class="summary-site-pill">${domain} (${count})</span>`)
      .join("");
  } else {
    summarySitesWrap.classList.add("hidden");
  }

  chosenReflection = "Yes";
  reflectionButtons.forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.reflection === "Yes");
  });

  inputSummaryNotes.value = "";
  switchView("summary");
}

/**
 * Render Session History Log (Module 5)
 */
function renderHistory(history = []) {
  historyList.innerHTML = "";
  if (!history || history.length === 0) {
    historyList.innerHTML = `<div class="history-empty">No completed focus sessions yet.<br/>Start a session and stay intentional!</div>`;
    return;
  }

  history.forEach((item) => {
    const el = document.createElement("div");
    el.className = "history-item";

    let badgeClass = "badge-done";
    let badgeText = "🎯 Accomplished";
    if (item.reflection === "Partially") {
      badgeClass = "badge-part";
      badgeText = "🌱 Partial";
    } else if (item.reflection === "Not yet") {
      badgeClass = "badge-notyet";
      badgeText = "⏳ Not yet";
    }

    const dateStr = item.completedAt ? new Date(item.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

    el.innerHTML = `
      <div class="history-top-row">
        <span class="history-task">${escapeHtml(item.task || "Focus Session")}</span>
        <span class="history-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="history-meta">
        <span>⏱ ${item.actualDurationMinutes || 1}m focus</span>
        <span>·</span>
        <span>↩ ${item.metrics?.returnedToTaskCount || 0} catches</span>
        <span>·</span>
        <span>${dateStr}</span>
      </div>
      ${item.notes ? `<div class="history-note">"${escapeHtml(item.notes)}"</div>` : ""}
    `;

    historyList.appendChild(el);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

/**
 * Query Background Worker and Synchronize UI State
 */
async function fetchStateAndRender() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (!response || !response.success) return;

    if (response.settings) {
      if (Array.isArray(response.settings.customDistractions)) {
        customDistractionDomains = response.settings.customDistractions;
        customDistractionDomains.forEach((d) => selectedDistractionDomains.add(d));
      }
      if (Array.isArray(response.settings.allowlist)) {
        storedAllowlist = response.settings.allowlist;
      }
      renderDistractionPills();
    }

    if (response.pendingSummary) {
      renderSummary(response.pendingSummary);
    } else if (response.session && response.session.isActive) {
      renderActiveSession(response.session);
    } else {
      switchView("idle");
      setTimeout(() => inputTask.focus(), 50);
    }
  });
}

/**
 * Flash a brief "Saved" toast in embedded settings
 */
function showSettingsToast() {
  clearTimeout(settingsToastTimer);
  settingsSaveToast.classList.remove("hidden");
  settingsToastTimer = setTimeout(() => {
    settingsSaveToast.classList.add("hidden");
  }, 2000);
}

/**
 * Render chips inside the embedded Settings view
 */
function renderSettingsChips() {
  // 1. Distraction Chips
  settingsDistractionChips.innerHTML = "";
  const allDistractions = Array.from(new Set([
    ...DEFAULT_PRESET_DISTRACTIONS.map((d) => d.domain),
    ...customDistractionDomains
  ]));

  allDistractions.forEach((dom) => {
    const chip = document.createElement("span");
    chip.className = "settings-chip";
    chip.innerHTML = `
      <span>${escapeHtml(dom)}</span>
      <button type="button" class="chip-remove-btn" title="Remove ${escapeHtml(dom)}">×</button>
    `;

    chip.querySelector(".chip-remove-btn").addEventListener("click", () => {
      customDistractionDomains = customDistractionDomains.filter((d) => d !== dom);
      selectedDistractionDomains.delete(dom);
      chrome.runtime.sendMessage(
        {
          type: "UPDATE_SETTINGS",
          payload: { customDistractions: customDistractionDomains }
        },
        () => {
          showSettingsToast();
          renderSettingsChips();
          renderDistractionPills();
        }
      );
    });

    settingsDistractionChips.appendChild(chip);
  });

  // 2. Allowlist Chips
  settingsAllowlistChips.innerHTML = "";
  if (!storedAllowlist || storedAllowlist.length === 0) {
    settingsAllowlistChips.innerHTML = `<span style="font-size:11px; color:#6b7280; font-style:italic;">No custom allowlist sites.</span>`;
  } else {
    storedAllowlist.forEach((dom) => {
      const chip = document.createElement("span");
      chip.className = "settings-chip";
      chip.innerHTML = `
        <span>${escapeHtml(dom)}</span>
        <button type="button" class="chip-remove-btn" title="Remove ${escapeHtml(dom)}">×</button>
      `;

      chip.querySelector(".chip-remove-btn").addEventListener("click", () => {
        storedAllowlist = storedAllowlist.filter((d) => d !== dom);
        chrome.runtime.sendMessage(
          {
            type: "UPDATE_SETTINGS",
            payload: { allowlist: storedAllowlist }
          },
          () => {
            showSettingsToast();
            renderSettingsChips();
          }
        );
      });

      settingsAllowlistChips.appendChild(chip);
    });
  }
}

/**
 * Open Settings directly in the same Side View
 */
function openEmbeddedSettings() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
    if (res?.settings) {
      customDistractionDomains = res.settings.customDistractions || [];
      storedAllowlist = res.settings.allowlist || [];
      if (toggleSoundSettings) toggleSoundSettings.checked = res.settings.soundEnabled !== false;
      if (toggleNewtabSettings) toggleNewtabSettings.checked = res.settings.enableNewTabDashboard !== false;
      if (selectDurationSettings && res.settings.defaultDuration) {
        selectDurationSettings.value = String(res.settings.defaultDuration);
      }
    }
    renderSettingsChips();
    switchView("settings");
  });
}

/**
 * Helper to add a custom distraction from an input field
 */
function handleAddInlineDistraction() {
  const domain = cleanDomain(inputInlineDistraction.value);
  if (!domain) return;

  if (!customDistractionDomains.includes(domain) && !DEFAULT_PRESET_DISTRACTIONS.some((p) => p.domain === domain)) {
    customDistractionDomains.push(domain);
  }
  selectedDistractionDomains.add(domain);

  chrome.runtime.sendMessage(
    {
      type: "UPDATE_SETTINGS",
      payload: { customDistractions: customDistractionDomains }
    },
    () => {
      inputInlineDistraction.value = "";
      renderDistractionPills();
    }
  );
}

/**
 * Event Listeners
 */

// Inline distraction add in Idle View
btnInlineAddDistraction.addEventListener("click", handleAddInlineDistraction);
inputInlineDistraction.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleAddInlineDistraction();
  }
});

// Duration pill selection
durationPills.forEach((btn) => {
  btn.addEventListener("click", () => {
    durationPills.forEach((p) => p.classList.remove("active"));
    inputCustomMins.value = "";
    btn.classList.add("active");
    selectedMinutes = parseInt(btn.dataset.mins, 10);
  });
});

inputCustomMins.addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  if (!isNaN(val) && val > 0) {
    durationPills.forEach((p) => p.classList.remove("active"));
    selectedMinutes = Math.min(180, val);
  }
});

// Start Focus Session
btnStartFocus.addEventListener("click", () => {
  const task = inputTask.value.trim() || "Deep Focus";
  const distractionDomains = Array.from(selectedDistractionDomains);

  btnStartFocus.disabled = true;

  chrome.runtime.sendMessage(
    {
      type: "START_SESSION",
      payload: {
        task,
        durationMinutes: selectedMinutes,
        distractionDomains
      }
    },
    (res) => {
      btnStartFocus.disabled = false;
      if (res && res.success) {
        renderActiveSession(res.session);
      }
    }
  );
});

inputTask.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    btnStartFocus.click();
  }
});

// Pause / Resume Session
btnPauseSession.addEventListener("click", () => {
  if (!currentSession) return;

  if (currentSession.isPaused) {
    chrome.runtime.sendMessage({ type: "RESUME_SESSION" }, (res) => {
      if (res && res.success) {
        currentSession = res.session;
        renderActiveSession(res.session);
      }
    });
  } else {
    chrome.runtime.sendMessage({ type: "PAUSE_SESSION" }, (res) => {
      if (res && res.success) {
        currentSession = res.session;
        renderActiveSession(res.session);
      }
    });
  }
});

// End Session Early
btnEndSession.addEventListener("click", () => {
  if (confirm("End this focus session now?")) {
    chrome.runtime.sendMessage({ type: "END_SESSION_EARLY" }, () => {
      fetchStateAndRender();
    });
  }
});

// Reflection Button Choices
reflectionButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    reflectionButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    chosenReflection = btn.dataset.reflection;
  });
});

// Save Reflection & Close
btnCloseSummary.addEventListener("click", () => {
  const notes = inputSummaryNotes.value.trim();
  chrome.runtime.sendMessage(
    {
      type: "SUBMIT_REFLECTION",
      payload: { reflection: chosenReflection, notes }
    },
    () => {
      switchView("idle");
      try {
        window.close();
      } catch (e) {
        // Safe in side panel environment
      }
    }
  );
});

// View History Toggle
btnToggleHistory.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
    renderHistory(res?.history || []);
    switchView("history");
  });
});

// Prominent Back Buttons from History View (Top & Bottom)
if (btnBackFromHistoryTop) {
  btnBackFromHistoryTop.addEventListener("click", () => switchView(previousActiveView));
}
if (btnBackFromHistory) {
  btnBackFromHistory.addEventListener("click", () => switchView(previousActiveView));
}

btnClearHistory.addEventListener("click", () => {
  if (confirm("Clear all past session history?")) {
    chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" }, () => {
      renderHistory([]);
    });
  }
});

// Open In-Side-View Settings (In-Place, No New Window)
btnOpenOptions.addEventListener("click", () => {
  openEmbeddedSettings();
});

// Prominent Back Buttons from Settings View (Top & Bottom)
if (btnBackFromSettings) {
  btnBackFromSettings.addEventListener("click", () => switchView(previousActiveView));
}
if (btnBackFromSettingsBottom) {
  btnBackFromSettingsBottom.addEventListener("click", () => switchView(previousActiveView));
}

// Embedded Settings Forms
if (formSettingsDistraction) {
  formSettingsDistraction.addEventListener("submit", (e) => {
    e.preventDefault();
    const dom = cleanDomain(inputSettingsDistraction.value);
    if (!dom) return;

    if (!customDistractionDomains.includes(dom) && !DEFAULT_PRESET_DISTRACTIONS.some((p) => p.domain === dom)) {
      customDistractionDomains.push(dom);
    }
    selectedDistractionDomains.add(dom);

    chrome.runtime.sendMessage(
      {
        type: "UPDATE_SETTINGS",
        payload: { customDistractions: customDistractionDomains }
      },
      () => {
        inputSettingsDistraction.value = "";
        showSettingsToast();
        renderSettingsChips();
        renderDistractionPills();
      }
    );
  });
}

if (formSettingsAllowlist) {
  formSettingsAllowlist.addEventListener("submit", (e) => {
    e.preventDefault();
    const dom = cleanDomain(inputSettingsAllowlist.value);
    if (!dom) return;

    if (!storedAllowlist.includes(dom)) {
      storedAllowlist.push(dom);
    }

    chrome.runtime.sendMessage(
      {
        type: "UPDATE_SETTINGS",
        payload: { allowlist: storedAllowlist }
      },
      () => {
        inputSettingsAllowlist.value = "";
        showSettingsToast();
        renderSettingsChips();
      }
    );
  });
}

if (toggleSoundSettings) {
  toggleSoundSettings.addEventListener("change", (e) => {
    chrome.runtime.sendMessage(
      {
        type: "UPDATE_SETTINGS",
        payload: { soundEnabled: e.target.checked }
      },
      () => showSettingsToast()
    );
  });
}

if (toggleNewtabSettings) {
  toggleNewtabSettings.addEventListener("change", (e) => {
    chrome.runtime.sendMessage(
      {
        type: "UPDATE_SETTINGS",
        payload: { enableNewTabDashboard: e.target.checked }
      },
      () => showSettingsToast()
    );
  });
}

if (selectDurationSettings) {
  selectDurationSettings.addEventListener("change", (e) => {
    const val = parseInt(e.target.value, 10);
    chrome.runtime.sendMessage(
      {
        type: "UPDATE_SETTINGS",
        payload: { defaultDuration: val }
      },
      () => showSettingsToast()
    );
  });
}

// Real-time Event Listener
chrome.runtime.onMessage.addListener((message) => {
  if (
    message.type === "SESSION_STARTED" ||
    message.type === "SESSION_PAUSED" ||
    message.type === "SESSION_RESUMED" ||
    message.type === "SESSION_COMPLETED"
  ) {
    fetchStateAndRender();
  }
});

// Initial boot
renderDistractionPills();
fetchStateAndRender();
