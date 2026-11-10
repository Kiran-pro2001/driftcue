# DriftCue — Intention-Aware Browsing Companion

> **"Notice the drift. Return to what matters."**

DriftCue is a task-aware Chrome extension (Manifest V3) that helps you stay mindful and intentional while browsing. Rather than blindly blocking websites, DriftCue anchors your immediate goal, catches moments of drift, and makes returning to your task effortless.

---

## ⚡ The Core Loop

1. **Before Browsing (Set Intention):** Enter your task and pick time/distraction presets in under 5 seconds.
2. **During Browsing (Ambient Anchor):** New tabs keep your active goal visible with live countdown and a 1-click return button.
3. **Drift Detection (Gentle Check-in):** Opening a designated distraction website (YouTube, Reddit, etc.) immediately pauses media and presents a non-judgmental prompt:
   - *↩ Take me back to my task* (switches back to previous tab)
   - *⏱ Continue for 5 minutes* (docks a floating timer pill in the corner)
   - *✓ Yes, this is intentional* (allows site for this session)
4. **After Browsing (Reflection):** Objective metrics and a 1-click self-reflection (*Accomplished / Partially / Not yet*).

---

## 🚀 How to Install & Test in Chrome

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **"Load unpacked"**.
4. Select the `DriftCue` folder (`/home/kiran-kumar/HDD/shipping/365Days_365Products/DriftCue`).
5. Pin **DriftCue** to your Chrome toolbar.
6. Click the DriftCue icon, type a task (e.g., *"Finish API integration"*), and click **Start Focus Session**!

---

## 📁 Architecture & File Structure

```
DriftCue/
├── manifest.json              # Chrome Manifest V3 configuration
├── assets/                    # DriftCue icons (16px, 48px, 128px)
├── background/
│   ├── service-worker.js      # Event-driven MV3 state manager & alarm engine
│   └── storage.js             # Storage schemas, domain matching & calculations
├── popup/
│   ├── popup.html             # Launchpad UI (Setup, Active Session, Summary, History)
│   ├── popup.css              # Warm dark mode styling (Linear/Raycast aesthetic)
│   └── popup.js               # Popup interactions & real-time synchronization
├── intervention/
│   ├── intervention.js        # Shadow DOM injected overlay, media pauser & floating pill
│   └── intervention.css       # Intervention stylesheet
├── newtab/
│   ├── newtab.html            # Adaptive New Tab (Anchor when active / Search & Clock when idle)
│   ├── newtab.css             # Ambient new tab layout & typography
│   └── newtab.js              # Live clock, Google search & session controller
├── options/
│   ├── options.html           # Settings & preferences page
│   ├── options.css            # Settings styling & interactive toggle controls
│   └── options.js             # Allowlist & custom distraction manager
└── README.md
```

---

## 🛡 Privacy
All DriftCue session logs and metrics are stored 100% locally on your machine via `chrome.storage.local`. Zero external tracking, zero cloud accounts required.
