/**
 * DriftCue — The Guardian Content Script (Module 3)
 * Injects an isolated Shadow DOM intervention overlay on distraction websites,
 * pauses autoplaying media, provides an enlarged peaceful 5-minute floating pill timer,
 * and handles seamless return-to-task recovery.
 */

(function () {
  if (window.__driftcue_guardian_injected) return;
  window.__driftcue_guardian_injected = true;

  let shadowRoot = null;
  let shadowHost = null;
  let mediaPausedByDriftCue = [];
  let floatingPillInterval = null;
  let currentInterventionData = null;

  function pauseMediaOnPage() {
    try {
      const mediaElements = document.querySelectorAll("video, audio");
      mediaPausedByDriftCue = [];
      mediaElements.forEach((el) => {
        if (!el.paused) {
          el.pause();
          mediaPausedByDriftCue.push(el);
        }
      });
    } catch (e) {}
  }

  function resumeMediaOnPage() {
    try {
      mediaPausedByDriftCue.forEach((el) => {
        el.play().catch(() => {});
      });
      mediaPausedByDriftCue = [];
    } catch (e) {}
  }

  function ensureShadowRoot() {
    if (shadowRoot) return shadowRoot;

    shadowHost = document.createElement("div");
    shadowHost.id = "driftcue-guardian-host";
    shadowHost.style.all = "initial";

    shadowRoot = shadowHost.attachShadow({ mode: "open" });

    const styleEl = document.createElement("style");
    styleEl.textContent = getGuardianStyles();
    shadowRoot.appendChild(styleEl);

    const mount = () => {
      if (!document.body && !document.documentElement) {
        requestAnimationFrame(mount);
        return;
      }
      (document.body || document.documentElement).appendChild(shadowHost);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount, { once: true });
    } else {
      mount();
    }

    return shadowRoot;
  }

  function formatSeconds(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  /**
   * Render the Intervention Overlay (Check-in Screen) with prominent branding
   */
  function renderInterventionOverlay(data) {
    currentInterventionData = data;
    pauseMediaOnPage();
    const root = ensureShadowRoot();

    const existing = root.getElementById("driftcue-overlay-container");
    if (existing) existing.remove();

    const container = document.createElement("div");
    container.id = "driftcue-overlay-container";
    container.innerHTML = `
      <div class="dc-backdrop">
        <div class="dc-modal" role="dialog" aria-modal="true">
          <!-- Prominent Brand Header with Tagline -->
          <div class="dc-header-row">
            <div class="dc-brand-group">
              <img src="${chrome.runtime.getURL('assets/icon48.png')}" alt="DriftCue" class="dc-brand-logo" />
              <div>
                <h1 class="dc-brand-name">DriftCue</h1>
                <p class="dc-brand-tagline">Notice the drift. Return to what matters.</p>
              </div>
            </div>
            <span class="dc-badge">
              <span class="dc-pulse"></span> Check-in
            </span>
          </div>

          <!-- Target Intention -->
          <div class="dc-task-box">
            <span class="dc-task-label">You set out to accomplish:</span>
            <h2 class="dc-task-title">${escapeHtml(data.task || "Your Focus Goal")}</h2>
          </div>

          <!-- Question -->
          <div class="dc-prompt">
            <p class="dc-prompt-main">
              You just opened <strong>${escapeHtml(data.domain)}</strong>. Is this visit helping you with your current task?
            </p>
            <p class="dc-prompt-sub">A reminder, not a punishment. Your intention stays with you.</p>
          </div>

          <!-- Action Buttons -->
          <div class="dc-actions">
            <button id="dc-btn-return" class="dc-btn dc-btn-primary">
              <span class="dc-icon">↩</span> Take me back to my task
            </button>
            <div class="dc-actions-secondary">
              <button id="dc-btn-5min" class="dc-btn dc-btn-secondary">
                <span class="dc-icon">⏱</span> Continue for 5 minutes
              </button>
              <button id="dc-btn-intentional" class="dc-btn dc-btn-ghost">
                Yes, this is intentional
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    root.appendChild(container);

    root.getElementById("dc-btn-return").addEventListener("click", handleReturnToTask);
    root.getElementById("dc-btn-5min").addEventListener("click", () => handleStart5MinPass(data.domain));
    root.getElementById("dc-btn-intentional").addEventListener("click", () => handleMarkIntentional(data.domain));
  }

  /**
   * Render the 5-Minute Expiry Re-Prompt Modal
   */
  function renderExpiryReprompt(domain, task) {
    pauseMediaOnPage();
    removeFloatingPill();

    const root = ensureShadowRoot();
    const existing = root.getElementById("driftcue-overlay-container");
    if (existing) existing.remove();

    const container = document.createElement("div");
    container.id = "driftcue-overlay-container";
    container.innerHTML = `
      <div class="dc-backdrop">
        <div class="dc-modal dc-modal-expiry">
          <div class="dc-header-row">
            <div class="dc-brand-group">
              <img src="${chrome.runtime.getURL('assets/icon48.png')}" alt="DriftCue" class="dc-brand-logo" />
              <div>
                <h1 class="dc-brand-name">DriftCue</h1>
                <p class="dc-brand-tagline">Notice the drift. Return to what matters.</p>
              </div>
            </div>
            <span class="dc-badge dc-badge-sand">
              <span class="dc-pulse dc-pulse-sand"></span> 5m Elapsed
            </span>
          </div>

          <div class="dc-task-box">
            <span class="dc-task-label">Active Goal:</span>
            <h2 class="dc-task-title">${escapeHtml(task || "Your Focus Goal")}</h2>
          </div>

          <div class="dc-prompt">
            <p class="dc-prompt-main">
              Your 5-minute detour on <strong>${escapeHtml(domain)}</strong> is up. Ready to return to your task?
            </p>
          </div>

          <div class="dc-actions">
            <button id="dc-btn-return-expiry" class="dc-btn dc-btn-primary">
              <span class="dc-icon">↩</span> Return to my task now
            </button>
            <div class="dc-actions-secondary">
              <button id="dc-btn-extend-5min" class="dc-btn dc-btn-secondary">
                <span class="dc-icon">+</span> Extend 5 more minutes
              </button>
              <button id="dc-btn-intentional-expiry" class="dc-btn dc-btn-ghost">
                Mark as Intentional
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    root.appendChild(container);

    root.getElementById("dc-btn-return-expiry").addEventListener("click", handleReturnToTask);
    root.getElementById("dc-btn-extend-5min").addEventListener("click", () => handleStart5MinPass(domain));
    root.getElementById("dc-btn-intentional-expiry").addEventListener("click", () => handleMarkIntentional(domain));
  }

  /**
   * Render the Enlarged In-Page Mini Floating Pill (Option A)
   */
  function renderFloatingPill(domain, initialRemainingSeconds) {
    removeOverlay();
    resumeMediaOnPage();

    const root = ensureShadowRoot();
    removeFloatingPill();

    let secondsLeft = initialRemainingSeconds;

    const pill = document.createElement("div");
    pill.id = "dc-floating-pill";
    pill.innerHTML = `
      <div class="dc-pill-content">
        <span class="dc-pill-pulse"></span>
        <span class="dc-pill-timer" id="dc-pill-timer">${formatSeconds(secondsLeft)}</span>
        <span class="dc-pill-sep">·</span>
        <span class="dc-pill-domain" title="${escapeHtml(domain)}">${escapeHtml(domain)}</span>
        <button id="dc-pill-btn-return" class="dc-pill-return" title="Return to your task">
          Return to task ↩
        </button>
      </div>
    `;

    root.appendChild(pill);

    root.getElementById("dc-pill-btn-return").addEventListener("click", handleReturnToTask);

    clearInterval(floatingPillInterval);
    floatingPillInterval = setInterval(() => {
      secondsLeft -= 1;
      const timerEl = root.getElementById("dc-pill-timer");
      if (timerEl) {
        timerEl.textContent = formatSeconds(Math.max(0, secondsLeft));
      }

      if (secondsLeft <= 0) {
        clearInterval(floatingPillInterval);
        chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
          renderExpiryReprompt(domain, res?.session?.task);
        });
      }
    }, 1000);
  }

  function removeOverlay() {
    if (!shadowRoot) return;
    const overlay = shadowRoot.getElementById("driftcue-overlay-container");
    if (overlay) overlay.remove();
  }

  function removeFloatingPill() {
    clearInterval(floatingPillInterval);
    if (!shadowRoot) return;
    const pill = shadowRoot.getElementById("dc-floating-pill");
    if (pill) pill.remove();
  }

  function handleReturnToTask() {
    removeOverlay();
    removeFloatingPill();

    chrome.runtime.sendMessage(
      {
        type: "ACTION_RETURN_TO_TASK",
        payload: {}
      },
      (res) => {
        if (!res || !res.switched) {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = chrome.runtime.getURL("newtab/newtab.html");
          }
        }
      }
    );
  }

  function handleStart5MinPass(domain) {
    chrome.runtime.sendMessage(
      {
        type: "ACTION_TEMPORARY_PASS",
        payload: { domain, minutes: 5 }
      },
      (res) => {
        if (res && res.success) {
          renderFloatingPill(domain, res.remainingSeconds || 300);
        } else {
          removeOverlay();
          resumeMediaOnPage();
        }
      }
    );
  }

  function handleMarkIntentional(domain) {
    chrome.runtime.sendMessage(
      {
        type: "ACTION_INTENTIONAL",
        payload: { domain }
      },
      () => {
        removeOverlay();
        removeFloatingPill();
        resumeMediaOnPage();
      }
    );
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "PASS_EXPIRED") {
      renderExpiryReprompt(message.domain, message.task);
    } else if (message.type === "SESSION_PAUSED" || message.type === "SESSION_COMPLETED") {
      removeOverlay();
      removeFloatingPill();
      resumeMediaOnPage();
    }
  });

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Peace Product Design System (Quiet Sage & Mineral Stone)
   */
  function getGuardianStyles() {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      /* Modal Backdrop */
      .dc-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 18, 17, 0.94);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: dcFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes dcFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      /* Modal Card */
      .dc-modal {
        background: #1a1f1d;
        border: 1px solid #262f2b;
        border-radius: 18px;
        width: 100%;
        max-width: 490px;
        padding: 30px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03);
        color: #e4eae6;
        animation: dcSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes dcSlideUp {
        from { transform: translateY(12px) scale(0.98); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }

      /* Prominent Brand Header */
      .dc-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 22px;
        padding-bottom: 14px;
        border-bottom: 1px solid #262f2b;
      }

      .dc-brand-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .dc-brand-logo {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        border: 1px solid #262f2b;
      }

      .dc-brand-name {
        font-size: 17px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.2px;
      }

      .dc-brand-tagline {
        font-size: 11px;
        color: #8e9e96;
        margin-top: 1px;
      }

      .dc-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(122, 154, 139, 0.15);
        color: #8eae9d;
        border: 1px solid rgba(122, 154, 139, 0.3);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 4px 10px;
        border-radius: 20px;
      }

      .dc-badge-sand {
        background: rgba(197, 165, 130, 0.15);
        color: #d6ba9c;
        border-color: rgba(197, 165, 130, 0.3);
      }

      .dc-pulse {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #7a9a8b;
        animation: dcPulseAnim 1.8s infinite;
      }

      .dc-pulse-sand {
        background: #c5a582;
      }

      @keyframes dcPulseAnim {
        0% { transform: scale(0.95); opacity: 0.6; }
        50% { transform: scale(1.3); opacity: 1; }
        100% { transform: scale(0.95); opacity: 0.6; }
      }

      /* Task Intention Box */
      .dc-task-box {
        background: #1e2421;
        border: 1px solid #262f2b;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 20px;
      }

      .dc-task-label {
        display: block;
        font-size: 11px;
        color: #8e9e96;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .dc-task-title {
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
        line-height: 1.35;
        word-break: break-word;
      }

      /* Prompt text */
      .dc-prompt {
        margin-bottom: 24px;
      }

      .dc-prompt-main {
        font-size: 14px;
        line-height: 1.5;
        color: #e4eae6;
        margin-bottom: 6px;
      }

      .dc-prompt-main strong {
        color: #c5a582;
        font-weight: 600;
      }

      .dc-prompt-sub {
        font-size: 12px;
        color: #7d8b84;
      }

      /* Action Buttons */
      .dc-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .dc-btn {
        width: 100%;
        padding: 12px 18px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.15s ease;
        border: none;
        outline: none;
      }

      .dc-btn-primary {
        background: #7a9a8b;
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(122, 154, 139, 0.3);
      }

      .dc-btn-primary:hover {
        background: #6a897b;
        transform: translateY(-1px);
      }

      .dc-actions-secondary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .dc-btn-secondary {
        background: #212825;
        border: 1px solid #2d3832;
        color: #e4eae6;
      }

      .dc-btn-secondary:hover {
        background: #28322c;
        border-color: #38463e;
        color: #ffffff;
      }

      .dc-btn-ghost {
        background: transparent;
        border: 1px solid transparent;
        color: #8e9e96;
      }

      .dc-btn-ghost:hover {
        background: rgba(255, 255, 255, 0.04);
        color: #ffffff;
      }

      .dc-icon {
        font-size: 14px;
      }

      /* ENLARGED Floating Mini Pill Timer (User Request) */
      #dc-floating-pill {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 2147483646;
        background: rgba(18, 21, 20, 0.95);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(122, 154, 139, 0.4);
        border-radius: 40px;
        padding: 12px 20px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.03);
        animation: dcSlideInPill 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes dcSlideInPill {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .dc-pill-content {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        color: #e4eae6;
        font-weight: 500;
      }

      .dc-pill-pulse {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #7a9a8b;
        animation: dcPulseAnim 1.8s infinite;
      }

      .dc-pill-timer {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 16px;
        font-weight: 700;
        color: #8eae9d;
        letter-spacing: 0.5px;
      }

      .dc-pill-sep {
        color: #55665e;
      }

      .dc-pill-domain {
        color: #8e9e96;
        max-width: 150px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 13px;
      }

      .dc-pill-return {
        background: #7a9a8b;
        color: #ffffff;
        border: none;
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        margin-left: 2px;
      }

      .dc-pill-return:hover {
        background: #6a897b;
        transform: translateY(-1px);
      }
    `;
  }

  chrome.runtime.sendMessage(
    {
      type: "CHECK_URL_STATUS",
      payload: { url: window.location.href }
    },
    (res) => {
      if (!res) return;

      if (res.shouldIntervene) {
        renderInterventionOverlay(res);
      } else if (res.hasTemporaryPass && res.passRemainingSeconds > 0) {
        renderFloatingPill(res.domain, res.passRemainingSeconds);
      }
    }
  );
})();
