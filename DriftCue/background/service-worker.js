/**
 * DriftCue — Background Service Worker (Manifest V3)
 * Manages event-driven session lifecycle, MV3-resilient alarms, navigation tracking, and cross-tab communication.
 */

import {
  INITIAL_STATE,
  getStorage,
  setStorage,
  getSession,
  updateSession,
  extractDomain,
  isDomainMatching,
  calculateRemainingSeconds,
  purgeExpiredPasses
} from "./storage.js";

const ALARM_SESSION = "DRIFTCUE_SESSION_ALARM";
const ALARM_TEMP_PREFIX = "DRIFTCUE_TEMP_";

/**
 * Configure Side Panel Behavior: Open side view automatically when extension icon is clicked
 */
function configureSidePanelBehavior() {
  if (chrome.sidePanel && typeof chrome.sidePanel.setPanelBehavior === "function") {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.warn("SidePanel setPanelBehavior:", err));
  }
}

// Register side panel behavior immediately at service worker top-level
configureSidePanelBehavior();

// Fallback action click handler in case browser/environment does not auto-dispatch via setPanelBehavior
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    if (chrome.sidePanel && typeof chrome.sidePanel.open === "function") {
      try {
        if (tab?.windowId) {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        }
      } catch (err) {
        console.warn("SidePanel open fallback:", err);
      }
    }
  });
}

/**
 * Extension Installation & Startup
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  configureSidePanelBehavior();
  const store = await getStorage();
  if (details.reason === "install") {
    await setStorage(INITIAL_STATE);
  } else {
    // Merge any missing keys from new updates
    await setStorage({
      settings: { ...INITIAL_STATE.settings, ...store.settings },
      session: { ...INITIAL_STATE.session, ...store.session }
    });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const store = await getStorage();
  if (store.session && store.session.isActive) {
    if (!store.session.isPaused && store.session.endTime && Date.now() >= store.session.endTime) {
      await handleSessionCompleted();
    }
  }
});

/**
 * Alarm Handler (MV3 Resilient Timers)
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_SESSION) {
    await handleSessionCompleted();
  } else if (alarm.name.startsWith(ALARM_TEMP_PREFIX)) {
    const domain = alarm.name.replace(ALARM_TEMP_PREFIX, "");
    await handleTemporaryPassExpired(domain);
  }
});

chrome.notifications.onClicked.addListener(async () => {
  // Open new tab to show pending summary
  chrome.tabs.create({ url: chrome.runtime.getURL("newtab/newtab.html") });
});

/**
 * Handle Focus Session Completion
 */
async function handleSessionCompleted() {
  const store = await getStorage();
  const session = store.session;
  if (!session || !session.isActive) return;

  const actualDurationMinutes = Math.max(
    1,
    Math.round((Date.now() - session.startTime - (session.totalPausedDuration || 0)) / 60000)
  );

  const pendingSummary = {
    id: "session_" + Date.now(),
    task: session.task,
    plannedDurationMinutes: session.durationMinutes,
    actualDurationMinutes,
    startedAt: session.startTime,
    completedAt: Date.now(),
    metrics: { ...session.metrics }
  };

  // Mark session inactive & save summary
  await setStorage({
    session: {
      ...session,
      isActive: false,
      isPaused: false,
      endTime: null,
      temporaryPasses: {},
      sessionAllowedDomains: []
    },
    pendingSummary
  });

  // Clear session alarm
  chrome.alarms.clear(ALARM_SESSION);

  // Send desktop notification
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon128.png"),
      title: "Focus Session Complete — DriftCue",
      message: `You focused on "${session.task}". Click to view your reflection.`,
      priority: 2
    });
  } catch (e) {
    console.warn("Notification error:", e);
  }

  // Broadcast to all tabs
  broadcastToTabs({ type: "SESSION_COMPLETED", summary: pendingSummary });
}

/**
 * Handle Expiration of a 5-Minute Pass
 */
async function handleTemporaryPassExpired(domain) {
  const store = await getStorage();
  let session = store.session;
  if (!session || !session.isActive) return;

  session = purgeExpiredPasses(session);
  await updateSession({ temporaryPasses: session.temporaryPasses });

  // Broadcast to tabs with matching domain
  broadcastToTabs({
    type: "PASS_EXPIRED",
    domain,
    task: session.task
  });
}

/**
 * Productive Tab Tracking (For "Take me back to my task")
 */
async function recordProductiveTab(tab) {
  if (!tab || !tab.id || !tab.url) return;
  const domain = extractDomain(tab.url);
  if (!domain) return; // Ignore internal chrome:// pages

  const store = await getStorage();
  const distractions = [
    ...(store.session.distractionDomains || []),
    ...(store.settings.customDistractions || [])
  ];

  // If this tab is NOT a distraction, it's productive
  if (!isDomainMatching(domain, distractions)) {
    await setStorage({
      navigation: {
        lastProductiveTabId: tab.id,
        lastProductiveUrl: tab.url,
        lastProductiveTitle: tab.title || "Previous Task Tab"
      }
    });
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await recordProductiveTab(tab);
  } catch (e) {
    // Tab might have been closed
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    await recordProductiveTab(tab);
  }
});

/**
 * Broadcast message helper to all open browser tabs
 */
function broadcastToTabs(payload) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith("chrome://")) {
        chrome.tabs.sendMessage(tab.id, payload).catch(() => {
          // Tab may not have content script injected (normal)
        });
      }
    }
  });
}

/**
 * Central Message Router
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleAsyncMessage = async () => {
    const store = await getStorage();
    const session = store.session;

    switch (message.type) {
      case "GET_STATE": {
        const remainingSeconds = calculateRemainingSeconds(session);
        sendResponse({
          success: true,
          session,
          settings: store.settings,
          navigation: store.navigation,
          pendingSummary: store.pendingSummary,
          history: store.history || [],
          remainingSeconds
        });
        break;
      }

      case "START_SESSION": {
        const { task, durationMinutes, distractionDomains } = message.payload;
        const duration = Math.max(1, parseInt(durationMinutes, 10) || 25);
        const startTime = Date.now();
        const endTime = startTime + duration * 60 * 1000;

        const newSession = {
          isActive: true,
          isPaused: false,
          task: task ? task.trim() : "Deep Focus",
          durationMinutes: duration,
          startTime,
          endTime,
          pausedAt: null,
          totalPausedDuration: 0,
          distractionDomains: distractionDomains || session.distractionDomains,
          sessionAllowedDomains: [],
          temporaryPasses: {},
          metrics: {
            interventionsCount: 0,
            returnedToTaskCount: 0,
            fiveMinPassCount: 0,
            markedIntentionalCount: 0,
            sitesVisited: {}
          }
        };

        await setStorage({
          session: newSession,
          pendingSummary: null
        });

        // Set alarm for session end
        chrome.alarms.create(ALARM_SESSION, { when: endTime });

        broadcastToTabs({ type: "SESSION_STARTED", session: newSession });
        sendResponse({ success: true, session: newSession });
        break;
      }

      case "PAUSE_SESSION": {
        if (!session.isActive || session.isPaused) {
          sendResponse({ success: false, error: "Cannot pause" });
          return;
        }

        const updatedSession = await updateSession({
          isPaused: true,
          pausedAt: Date.now()
        });

        chrome.alarms.clear(ALARM_SESSION);
        broadcastToTabs({ type: "SESSION_PAUSED", session: updatedSession });
        sendResponse({ success: true, session: updatedSession });
        break;
      }

      case "RESUME_SESSION": {
        if (!session.isActive || !session.isPaused) {
          sendResponse({ success: false, error: "Cannot resume" });
          return;
        }

        const pauseDuration = Date.now() - (session.pausedAt || Date.now());
        const newEndTime = session.endTime + pauseDuration;
        const totalPausedDuration = (session.totalPausedDuration || 0) + pauseDuration;

        const updatedSession = await updateSession({
          isPaused: false,
          pausedAt: null,
          endTime: newEndTime,
          totalPausedDuration
        });

        chrome.alarms.create(ALARM_SESSION, { when: newEndTime });
        broadcastToTabs({ type: "SESSION_RESUMED", session: updatedSession });
        sendResponse({ success: true, session: updatedSession });
        break;
      }

      case "END_SESSION_EARLY": {
        if (!session.isActive) {
          sendResponse({ success: false, error: "No active session" });
          return;
        }
        await handleSessionCompleted();
        sendResponse({ success: true });
        break;
      }

      case "CHECK_URL_STATUS": {
        const { url } = message.payload;
        if (!session.isActive || session.isPaused) {
          sendResponse({ shouldIntervene: false });
          return;
        }

        const domain = extractDomain(url);
        if (!domain) {
          sendResponse({ shouldIntervene: false });
          return;
        }

        // 1. Check Allowlist (permanent)
        if (isDomainMatching(domain, store.settings.allowlist || [])) {
          sendResponse({ shouldIntervene: false, isAllowed: true });
          return;
        }

        // 2. Check Session-Allowed Domains (marked "intentional" in this session)
        if (isDomainMatching(domain, session.sessionAllowedDomains || [])) {
          sendResponse({ shouldIntervene: false, isIntentional: true });
          return;
        }

        // 3. Check Active Temporary 5-min Pass
        const tempExpiry = session.temporaryPasses && session.temporaryPasses[domain];
        if (tempExpiry && tempExpiry > Date.now()) {
          const passRemainingSeconds = Math.max(0, Math.floor((tempExpiry - Date.now()) / 1000));
          sendResponse({
            shouldIntervene: false,
            hasTemporaryPass: true,
            passRemainingSeconds,
            domain
          });
          return;
        }

        // 4. Check Distractions
        const allDistractions = [
          ...(session.distractionDomains || []),
          ...(store.settings.customDistractions || [])
        ];

        if (isDomainMatching(domain, allDistractions)) {
          // Log intervention attempt
          const metrics = { ...session.metrics };
          metrics.interventionsCount = (metrics.interventionsCount || 0) + 1;
          metrics.sitesVisited = { ...metrics.sitesVisited };
          metrics.sitesVisited[domain] = (metrics.sitesVisited[domain] || 0) + 1;

          await updateSession({ metrics });

          sendResponse({
            shouldIntervene: true,
            task: session.task,
            domain,
            metrics
          });
          return;
        }

        sendResponse({ shouldIntervene: false });
        break;
      }

      case "ACTION_INTENTIONAL": {
        const { domain } = message.payload;
        if (!domain) {
          sendResponse({ success: false });
          return;
        }

        const sessionAllowedDomains = [...new Set([...(session.sessionAllowedDomains || []), domain])];
        const metrics = { ...session.metrics };
        metrics.markedIntentionalCount = (metrics.markedIntentionalCount || 0) + 1;

        await updateSession({ sessionAllowedDomains, metrics });
        sendResponse({ success: true, domain });
        break;
      }

      case "ACTION_TEMPORARY_PASS": {
        const { domain, minutes = 5 } = message.payload;
        if (!domain) {
          sendResponse({ success: false });
          return;
        }

        const durationMs = minutes * 60 * 1000;
        const expiry = Date.now() + durationMs;

        const temporaryPasses = {
          ...(session.temporaryPasses || {}),
          [domain]: expiry
        };

        const metrics = { ...session.metrics };
        metrics.fiveMinPassCount = (metrics.fiveMinPassCount || 0) + 1;

        await updateSession({ temporaryPasses, metrics });

        // Set alarm for pass expiry
        chrome.alarms.create(`${ALARM_TEMP_PREFIX}${domain}`, { when: expiry });

        sendResponse({
          success: true,
          domain,
          expiry,
          remainingSeconds: minutes * 60
        });
        break;
      }

      case "ACTION_RETURN_TO_TASK": {
        const currentTabId = message.payload?.currentTabId || sender.tab?.id;
        const metrics = { ...session.metrics };
        metrics.returnedToTaskCount = (metrics.returnedToTaskCount || 0) + 1;
        await updateSession({ metrics });

        const targetTabId = store.navigation.lastProductiveTabId;

        // Try switching to last productive tab
        let switched = false;
        if (targetTabId && targetTabId !== currentTabId) {
          try {
            const targetTab = await chrome.tabs.get(targetTabId);
            if (targetTab) {
              await chrome.tabs.update(targetTabId, { active: true });
              if (targetTab.windowId) {
                await chrome.windows.update(targetTab.windowId, { focused: true });
              }
              switched = true;
            }
          } catch (e) {
            switched = false;
          }
        }

        // Close current distraction tab if we successfully switched away
        if (switched && currentTabId) {
          try {
            await chrome.tabs.remove(currentTabId);
          } catch (e) {
            // Ignore if already closing
          }
        }

        sendResponse({
          success: true,
          switched,
          lastProductiveUrl: store.navigation.lastProductiveUrl
        });
        break;
      }

      case "SUBMIT_REFLECTION": {
        const { reflection, notes } = message.payload;
        const pendingSummary = store.pendingSummary;

        if (pendingSummary) {
          const completedSessionRecord = {
            ...pendingSummary,
            reflection: reflection || "Yes",
            notes: notes || "",
            savedAt: Date.now()
          };

          const history = [completedSessionRecord, ...(store.history || [])].slice(0, 50); // Keep last 50

          await setStorage({
            pendingSummary: null,
            history
          });
        }

        sendResponse({ success: true });
        break;
      }

      case "CLEAR_HISTORY": {
        await setStorage({ history: [] });
        sendResponse({ success: true });
        break;
      }

      case "DISMISS_PENDING_SUMMARY": {
        await setStorage({ pendingSummary: null });
        sendResponse({ success: true });
        break;
      }

      case "UPDATE_SETTINGS": {
        const updatedSettings = { ...store.settings, ...message.payload };
        await setStorage({ settings: updatedSettings });
        sendResponse({ success: true, settings: updatedSettings });
        break;
      }

      default:
        sendResponse({ success: false, error: "Unknown message type" });
    }
  };

  handleAsyncMessage();
  return true; // Keep message channel open for async response
});
