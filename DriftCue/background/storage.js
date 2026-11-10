/**
 * DriftCue — Persistent Storage Engine & State Manager
 * Handles all reads/writes to chrome.storage.local with defaults and validation.
 */

export const DEFAULT_DISTRACTIONS = [
  "youtube.com",
  "reddit.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "linkedin.com",
  "facebook.com",
  "tiktok.com"
];

export const DEFAULT_ALLOWLIST = [
  "github.com",
  "gitlab.com",
  "stackoverflow.com",
  "google.com",
  "notion.so",
  "figma.com"
];

export const INITIAL_STATE = {
  // Active session
  session: {
    isActive: false,
    isPaused: false,
    task: "",
    durationMinutes: 25,
    startTime: null,
    endTime: null,
    pausedAt: null,
    totalPausedDuration: 0,
    distractionDomains: [...DEFAULT_DISTRACTIONS],
    sessionAllowedDomains: [],
    temporaryPasses: {}, // { [domain]: expiryTimestamp }
    metrics: {
      interventionsCount: 0,
      returnedToTaskCount: 0,
      fiveMinPassCount: 0,
      markedIntentionalCount: 0,
      sitesVisited: {}
    }
  },

  // Active tab tracker for "Take me back to my task"
  navigation: {
    lastProductiveTabId: null,
    lastProductiveUrl: null,
    lastProductiveTitle: null
  },

  // User preferences
  settings: {
    enableNewTabDashboard: true,
    soundEnabled: true,
    defaultDuration: 25,
    customDistractions: [],
    allowlist: [...DEFAULT_ALLOWLIST]
  },

  // Session summary awaiting user reflection (if session just completed)
  pendingSummary: null,

  // Historical completed sessions
  history: []
};

/**
 * Read the entire DriftCue storage tree with fallback defaults
 */
export async function getStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      if (!result || Object.keys(result).length === 0) {
        resolve({ ...INITIAL_STATE });
      } else {
        resolve({
          session: { ...INITIAL_STATE.session, ...(result.session || {}) },
          navigation: { ...INITIAL_STATE.navigation, ...(result.navigation || {}) },
          settings: { ...INITIAL_STATE.settings, ...(result.settings || {}) },
          pendingSummary: result.pendingSummary || null,
          history: result.history || []
        });
      }
    });
  });
}

/**
 * Save updates to chrome.storage.local
 */
export async function setStorage(updates) {
  return new Promise((resolve) => {
    chrome.storage.local.set(updates, () => resolve());
  });
}

/**
 * Get current active session
 */
export async function getSession() {
  const store = await getStorage();
  return store.session;
}

/**
 * Update active session partially
 */
export async function updateSession(updates) {
  const store = await getStorage();
  const updatedSession = { ...store.session, ...updates };
  await setStorage({ session: updatedSession });
  return updatedSession;
}

/**
 * Clean domain string from URL (e.g. "https://www.reddit.com/r/webdev" -> "reddit.com")
 */
export function extractDomain(urlStr) {
  if (!urlStr) return "";
  try {
    const url = new URL(urlStr);
    // Ignore internal pages
    if (url.protocol.startsWith("chrome") || url.protocol === "about:") {
      return "";
    }
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch (e) {
    return "";
  }
}

/**
 * Check if a hostname matches any domain in target list.
 * Supports exact match and subdomains (e.g. "m.youtube.com" matches "youtube.com").
 */
export function isDomainMatching(hostname, domainList = []) {
  if (!hostname || !Array.isArray(domainList)) return false;
  const cleanHost = hostname.toLowerCase();

  return domainList.some((target) => {
    if (!target) return false;
    let cleanTarget = target.toLowerCase().trim();
    if (cleanTarget.startsWith("www.")) cleanTarget = cleanTarget.substring(4);

    return cleanHost === cleanTarget || cleanHost.endsWith("." + cleanTarget);
  });
}

/**
 * Calculate live remaining time in seconds for the session
 */
export function calculateRemainingSeconds(session) {
  if (!session || !session.isActive) return 0;
  if (session.isPaused && session.pausedAt) {
    // If paused, timer is frozen at pausedAt
    const remainingMs = session.endTime - session.pausedAt;
    return Math.max(0, Math.floor(remainingMs / 1000));
  }
  const remainingMs = session.endTime - Date.now();
  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Clean up expired temporary passes from session
 */
export function purgeExpiredPasses(session) {
  if (!session || !session.temporaryPasses) return session;
  const now = Date.now();
  const activePasses = {};
  for (const [domain, expiry] of Object.entries(session.temporaryPasses)) {
    if (expiry > now) {
      activePasses[domain] = expiry;
    }
  }
  return { ...session, temporaryPasses: activePasses };
}
