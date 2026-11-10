# DriftCue — Intention-Aware Browsing Companion 🎯

> **A Chrome extension that anchors what you set out to do and pauses distraction sites the moment you open them, so you stay intentional while browsing.**

[![Challenge: 365 Days, 365 Products](https://img.shields.io/badge/Challenge-365%20Days%2C%20365%20Products-7a9a8b?style=for-the-badge)](https://x.com/ErKiranKumar_)
[![Day: 001 of 365](https://img.shields.io/badge/Day-001%20of%20365-c5a582?style=for-the-badge)](https://x.com/ErKiranKumar_)
[![Privacy: 100% On--Device](https://img.shields.io/badge/Privacy-100%25%20Local-121514?style=for-the-badge)](https://github.com/Kiran-pro2001)

Part of the **365 Days, 365 Products** challenge by **Kiran Kumar** (Ex-Software Engineer at Oracle).  
**Day 001 / 365**.

---

## 💡 The Problem

Traditional website blockers treat adults like children. The moment you need YouTube for a 2-minute API tutorial or Reddit for a niche compiler bug, strict blockers lock you out completely. You get frustrated, toggle the blocker off, and 45 minutes vanish into algorithmic feeds.

**DriftCue takes a different approach**:
- It doesn't lock you out.
- It catches the unconscious impulse in under 50ms, pauses media, and gently asks: *"Is this what you set out to do?"*
- You can take a deliberate **5-minute detour with a live corner countdown**, or return to your code in **1 click**.

---

## ⚡ Core Features

1. **Instant Pattern Interrupt (<50ms)**: Intercepts designated distraction websites immediately upon tab open and pauses autoplay video/audio.
2. **5-Minute Floating Detour Pill**: Need an API tutorial or bug solution? Continue with a non-intrusive floating corner countdown timer.
3. **1-Click Task Recovery**: Click *"Take me back to my task"* to close the distraction tab and restore your code editor in 1 second flat.
4. **Zen Breathing New Tab**: Replaces blank tabs with an intention anchor and an 8-second breathing aura.
5. **100% On-Device Privacy**: Runs completely locally inside Chrome storage (`chrome.storage.local`). Zero cloud servers, zero analytics, zero data telemetry.

---

## 📁 Repository Structure

```
.
├── DriftCue/                  # Chrome Extension Source (Manifest V3)
│   ├── manifest.json          # Extension manifest & permissions
│   ├── assets/                # Extension icons (16px, 48px, 128px)
│   ├── background/            # Background service worker & storage engine
│   ├── intervention/          # Shadow DOM modal overlay & 5-min detour pill
│   ├── newtab/                # Zen breathing tab dashboard
│   ├── popup/                 # Toolbar launchpad popup UI
│   └── options/               # Settings & custom distraction domains
├── DriftCue landing page/     # Official Direct-Response Product Landing Page
│   ├── index.html             # High-converting landing page
│   ├── style.css              # Serene Sage theme & 3D micro-interactions
│   ├── script.js              # 3D ambient canvas & scroll reveal controllers
│   └── assets/                # Brand assets & icons
├── netlify.toml               # Automatic Netlify deployment configuration
└── README.md
```

---

## 🚀 How to Install DriftCue in Google Chrome

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Kiran-pro2001/driftcue.git
   ```
2. Open Google Chrome and go to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **"Load unpacked"**.
5. Select the `DriftCue` folder from this repo.
6. Pin **DriftCue** to your Chrome toolbar.
7. Click the DriftCue icon, type your active task (e.g., *"Fixing Auth API Bug"*), and start deep work!

---

## 🌐 Deploying the Landing Page to Netlify

This repository is pre-configured with `netlify.toml` pointing to `DriftCue landing page/`:

- **Option A (GitHub Integration)**: Connect this GitHub repo to Netlify. Netlify will automatically detect `netlify.toml` and deploy the landing page.
- **Option B (Drag and Drop)**: Simply drag the `DriftCue landing page` directory directly into [app.netlify.com/drop](https://app.netlify.com/drop) for instant deployment in 5 seconds.

---

## 👤 Crafted by Kiran Kumar

- **X (Twitter)**: [@ErKiranKumar_](https://x.com/ErKiranKumar_)
- **LinkedIn**: [Kiran Kumar](https://www.linkedin.com/in/kiran-kumar-sde/)
- **GitHub**: [@Kiran-pro2001](https://github.com/Kiran-pro2001)
- **Challenge**: #365Days365Products #ProjectShipyard

Crafted with care from Bengaluru, Bharat 🇮🇳
