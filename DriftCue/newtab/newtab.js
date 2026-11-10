/**
 * DriftCue — Adaptive New Tab Controller (Module 4 & 5)
 * Serves as the Intention Anchor during an active focus session,
 * presents the Reflection Summary upon completion,
 * and transforms into a sleek, minimal start page with Google search and clock when idle.
 */

// Elements - Views & Navigation
const ntpViewActive = document.getElementById("ntp-view-active");
const ntpViewIdle = document.getElementById("ntp-view-idle");
const ntpViewSummary = document.getElementById("ntp-view-summary");
const ntpStatusPill = document.getElementById("ntp-status-pill");
const ntpBtnSettings = document.getElementById("ntp-btn-settings");

// Active View Elements
const ntpTaskTitle = document.getElementById("ntp-task-title");
const ntpTimerDigits = document.getElementById("ntp-timer-digits");
const ntpTimerStatus = document.getElementById("ntp-timer-status");
const ntpBtnReturnTask = document.getElementById("ntp-btn-return-task");
const ntpBtnPause = document.getElementById("ntp-btn-pause");
const ntpPauseIcon = document.getElementById("ntp-pause-icon");
const ntpPauseText = document.getElementById("ntp-pause-text");
const ntpBtnEnd = document.getElementById("ntp-btn-end");
const ntpStatInterventions = document.getElementById("ntp-stat-interventions");
const ntpStatRecoveries = document.getElementById("ntp-stat-recoveries");

// Idle View Elements
const ntpClock = document.getElementById("ntp-clock");
const ntpDate = document.getElementById("ntp-date");
const ntpSearchForm = document.getElementById("ntp-search-form");
const ntpSearchInput = document.getElementById("ntp-search-input");
const ntpQuickTask = document.getElementById("ntp-quick-task");
const ntpBtnQuickStart = document.getElementById("ntp-btn-quick-start");
const quickPills = document.querySelectorAll(".quick-pill");
const ntpQuickCustomMins = document.getElementById("ntp-quick-custom-mins");
const ntpRecentWrap = document.getElementById("ntp-recent-wrap");
const ntpRecentList = document.getElementById("ntp-recent-list");

// Summary View Elements (Module 5)
const ntpSumTask = document.getElementById("ntp-sum-task");
const ntpSumActual = document.getElementById("ntp-sum-actual");
const ntpSumDrifts = document.getElementById("ntp-sum-drifts");
const ntpSumRecoveries = document.getElementById("ntp-sum-recoveries");
const ntpSumNotes = document.getElementById("ntp-sum-notes");
const ntpBtnSaveSummary = document.getElementById("ntp-btn-save-summary");
const reflectBtns = document.querySelectorAll(".ntp-reflect-btns .btn-reflect");

// Local State
let liveTimerInterval = null;
let currentSession = null;
let quickSelectedMins = 25;
let chosenReflection = "Yes";

/**
 * Format seconds to MM:SS
 */
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Clock & Date Live Update for Idle View
 */
function updateClockAndDate() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  ntpClock.textContent = `${hours}:${minutes} ${ampm}`;

  const options = { weekday: "long", month: "long", day: "numeric" };
  ntpDate.textContent = now.toLocaleDateString(undefined, options);
}

/**
 * Start Live Countdown for Active Session
 */
function startLiveCountdown(session) {
  clearInterval(liveTimerInterval);

  const updateDisplay = () => {
    if (!session || !session.isActive) {
      clearInterval(liveTimerInterval);
      return;
    }

    if (session.isPaused) {
      const remainingMs = session.endTime - session.pausedAt;
      const sec = Math.max(0, Math.floor(remainingMs / 1000));
      ntpTimerDigits.textContent = formatTime(sec);
      ntpTimerDigits.classList.add("paused");
      ntpTimerStatus.textContent = "Session is paused (break)";
      document.title = `[Paused] ${session.task || "Focus"} — DriftCue`;
      return;
    }

    ntpTimerDigits.classList.remove("paused");
    ntpTimerStatus.textContent = "Focus session in progress";
    const remainingMs = session.endTime - Date.now();
    const sec = Math.max(0, Math.floor(remainingMs / 1000));

    ntpTimerDigits.textContent = formatTime(sec);
    document.title = `${formatTime(sec)} • ${session.task || "Focus"} — DriftCue`;

    if (sec <= 0) {
      clearInterval(liveTimerInterval);
      syncAndRender();
    }
  };

  updateDisplay();
  liveTimerInterval = setInterval(updateDisplay, 1000);
}

/**
 * Render State A: Active Focus Anchor
 */
function renderActiveAnchor(session) {
  currentSession = session;
  ntpViewIdle.classList.add("hidden");
  ntpViewSummary.classList.add("hidden");
  ntpViewActive.classList.remove("hidden");

  ntpTaskTitle.textContent = session.task || "Deep Focus";

  if (session.isPaused) {
    ntpStatusPill.className = "status-pill status-paused";
    ntpStatusPill.textContent = "Session Paused";
    ntpPauseIcon.textContent = "▶";
    ntpPauseText.textContent = "Resume";
  } else {
    ntpStatusPill.className = "status-pill status-active";
    ntpStatusPill.textContent = "Focus Active";
    ntpPauseIcon.textContent = "⏸";
    ntpPauseText.textContent = "Pause";
  }

  const metrics = session.metrics || {};
  ntpStatInterventions.textContent = metrics.interventionsCount || 0;
  ntpStatRecoveries.textContent = metrics.returnedToTaskCount || 0;

  startLiveCountdown(session);
}

/**
 * Render State B: Idle Minimalist Start Page
 */
function renderIdlePage(history = []) {
  clearInterval(liveTimerInterval);
  document.title = "DriftCue — Focus Space";
  ntpViewActive.classList.add("hidden");
  ntpViewSummary.classList.add("hidden");
  ntpViewIdle.classList.remove("hidden");

  ntpStatusPill.className = "status-pill status-idle";
  ntpStatusPill.textContent = "Ready to Focus";

  updateClockAndDate();

  // Render recent sessions list
  if (history && history.length > 0) {
    ntpRecentWrap.classList.remove("hidden");
    const recent = history.slice(0, 3);
    ntpRecentList.innerHTML = recent
      .map(
        (h) => `
        <div class="recent-chip">
          <span>🎯</span>
          <span>${escapeHtml(h.task || "Focus")}</span>
          <span class="chip-time">${h.actualDurationMinutes || 1}m</span>
        </div>`
      )
      .join("");
  } else {
    ntpRecentWrap.classList.add("hidden");
  }

  setTimeout(() => ntpSearchInput.focus(), 80);
}

/**
 * Render State C: Reflection Summary (Module 5)
 */
function renderSummaryView(summary) {
  clearInterval(liveTimerInterval);
  document.title = "Session Complete — DriftCue";
  ntpViewActive.classList.add("hidden");
  ntpViewIdle.classList.add("hidden");
  ntpViewSummary.classList.remove("hidden");

  ntpStatusPill.className = "status-pill status-summary";
  ntpStatusPill.textContent = "Reflection";

  ntpSumTask.textContent = summary.task || "Focus Session";
  ntpSumActual.textContent = `${summary.actualDurationMinutes || 1}m`;
  ntpSumDrifts.textContent = summary.metrics?.interventionsCount || 0;
  ntpSumRecoveries.textContent = summary.metrics?.returnedToTaskCount || 0;

  chosenReflection = "Yes";
  reflectBtns.forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.reflection === "Yes");
  });
  ntpSumNotes.value = "";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

/**
 * Fetch Current State from Background Worker
 */
function syncAndRender() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
    if (!res || !res.success) return;

    if (res.pendingSummary) {
      renderSummaryView(res.pendingSummary);
    } else if (res.session && res.session.isActive) {
      renderActiveAnchor(res.session);
    } else {
      renderIdlePage(res.history || []);
    }
  });
}

/**
 * Event Handlers
 */

// Search Form Navigation
ntpSearchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = ntpSearchInput.value.trim();
  if (!query) return;

  if (query.startsWith("http://") || query.startsWith("https://")) {
    window.location.href = query;
  } else if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(query)) {
    window.location.href = "https://" + query;
  } else {
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }
});

// Return to Task Action
ntpBtnReturnTask.addEventListener("click", () => {
  chrome.runtime.sendMessage(
    {
      type: "ACTION_RETURN_TO_TASK",
      payload: {}
    },
    (res) => {
      if (res && res.switched) {
        window.close();
      }
    }
  );
});

// Pause / Resume Session
ntpBtnPause.addEventListener("click", () => {
  if (!currentSession) return;

  if (currentSession.isPaused) {
    chrome.runtime.sendMessage({ type: "RESUME_SESSION" }, (res) => {
      if (res && res.success) {
        renderActiveAnchor(res.session);
      }
    });
  } else {
    chrome.runtime.sendMessage({ type: "PAUSE_SESSION" }, (res) => {
      if (res && res.success) {
        renderActiveAnchor(res.session);
      }
    });
  }
});

// End Session Early
ntpBtnEnd.addEventListener("click", () => {
  if (confirm("End this focus session now?")) {
    chrome.runtime.sendMessage({ type: "END_SESSION_EARLY" }, () => {
      syncAndRender();
    });
  }
});

// Quick Duration Pills
quickPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    quickPills.forEach((p) => p.classList.remove("active"));
    if (ntpQuickCustomMins) ntpQuickCustomMins.value = "";
    pill.classList.add("active");
    quickSelectedMins = parseInt(pill.dataset.mins, 10);
  });
});

// Custom Timing Input (New Tab)
if (ntpQuickCustomMins) {
  ntpQuickCustomMins.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      quickPills.forEach((p) => p.classList.remove("active"));
      quickSelectedMins = Math.min(180, val);
    }
  });
}

// Quick Start Focus Session
function triggerQuickStart() {
  const task = ntpQuickTask.value.trim() || "Deep Focus";
  ntpBtnQuickStart.disabled = true;

  chrome.runtime.sendMessage(
    {
      type: "START_SESSION",
      payload: {
        task,
        durationMinutes: quickSelectedMins
      }
    },
    (res) => {
      ntpBtnQuickStart.disabled = false;
      if (res && res.success) {
        renderActiveAnchor(res.session);
      }
    }
  );
}

ntpBtnQuickStart.addEventListener("click", triggerQuickStart);
ntpQuickTask.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    triggerQuickStart();
  }
});

// Reflection Button Choices
reflectBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    reflectBtns.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    chosenReflection = btn.dataset.reflection;
  });
});

// Save Reflection on New Tab
ntpBtnSaveSummary.addEventListener("click", () => {
  const notes = ntpSumNotes.value.trim();
  chrome.runtime.sendMessage(
    {
      type: "SUBMIT_REFLECTION",
      payload: { reflection: chosenReflection, notes }
    },
    () => {
      syncAndRender();
    }
  );
});

// Open Options Page in the same tab
ntpBtnSettings.addEventListener("click", () => {
  window.location.href = chrome.runtime.getURL("options/options.html");
});

// Real-time Event Listener
chrome.runtime.onMessage.addListener((message) => {
  if (
    message.type === "SESSION_STARTED" ||
    message.type === "SESSION_PAUSED" ||
    message.type === "SESSION_RESUMED" ||
    message.type === "SESSION_COMPLETED"
  ) {
    syncAndRender();
  }
});

// Peaceful Meditative Breathing Ambient Background
function initZenBackground() {
  const canvas = document.getElementById("zen-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Four meditative breathing luminous orbs (Sage, Sandalwood, Forest Moss, Eucalyptus)
  const orbs = [
    {
      baseX: 0.35,
      baseY: 0.28,
      radius: 260,
      color: "rgba(122, 154, 139, 0.45)",
      speedX: 0.0003,
      speedY: 0.0004,
      breatheSpeed: 0.0006,
      phase: 0
    },
    {
      baseX: 0.72,
      baseY: 0.42,
      radius: 240,
      color: "rgba(197, 165, 130, 0.38)",
      speedX: 0.0004,
      speedY: 0.0003,
      breatheSpeed: 0.0007,
      phase: Math.PI / 2
    },
    {
      baseX: 0.25,
      baseY: 0.75,
      radius: 280,
      color: "rgba(35, 52, 43, 0.55)",
      speedX: 0.0003,
      speedY: 0.0005,
      breatheSpeed: 0.0005,
      phase: Math.PI
    },
    {
      baseX: 0.60,
      baseY: 0.80,
      radius: 230,
      color: "rgba(142, 174, 157, 0.35)",
      speedX: 0.0005,
      speedY: 0.0004,
      breatheSpeed: 0.0008,
      phase: (3 * Math.PI) / 2
    }
  ];

  let animFrameId = null;

  function render(time) {
    ctx.clearRect(0, 0, width, height);

    orbs.forEach((orb) => {
      const x = (orb.baseX + 0.07 * Math.sin(time * orb.speedX + orb.phase)) * width;
      const y = (orb.baseY + 0.05 * Math.cos(time * orb.speedY + orb.phase)) * height;

      // Smooth meditative expansion & contraction mirroring human breathing
      const breathe = Math.sin(time * orb.breatheSpeed + orb.phase);
      const currentRadius = orb.radius * (1 + 0.18 * breathe);

      const grad = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
      grad.addColorStop(0, orb.color);
      grad.addColorStop(1, "rgba(18, 21, 20, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    animFrameId = requestAnimationFrame(render);
  }

  // Energy & CPU saver: pause when tab is hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    } else {
      animFrameId = requestAnimationFrame(render);
    }
  });

  animFrameId = requestAnimationFrame(render);
}

setInterval(updateClockAndDate, 1000);
syncAndRender();
initZenBackground();
