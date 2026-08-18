# Offline Tierlist Maker

A modular, lightweight, web-based tool for creating custom tierlists entirely offline in your browser.

> **Credits**: Originally created by [silverweed](https://github.com/silverweed) ([silverweed/tiers](https://github.com/silverweed/tiers)) under the WTFPL License. Refactored into ES6 modules with automated unit testing and premium feature enhancements.

---

## 🌟 Key Features

- **🔒 Offline & Private**: All image processing and tierlist generation happens locally in your browser. No server uploads or accounts required.
- **✨ Dramatic Mystery Mode & Card Reveals**:
  - Enabled by default! Face-down mystery tiles in your pool marked with a floating `?`.
  - Full Clash Royale-style 3D card reveal sequence featuring decelerating spins, wind-up tilt back, high-speed flip slam, metallic gold card frames, and a shockwave impact burst.
  - Quick-tilt preview animation when clicking already-revealed cards or tier row items.
- **⚔️ Head-to-Head ELO Sorter**: Rank your items through 1v1 matchups with automated ELO rating sorting.
- **💰 Budget Mode**: Set point budgets for tier rows to build balanced team/card selections.
- **🏷️ Card Badges**: Add custom status or category badges directly onto card items.
- **🎬 GIF Animation Control**: Toggle animated GIF playback globally or per-card to save CPU/GPU resources.
- **🔍 Smart Image Deduplication**: Automatic hash-checking prevents duplicate image uploads into the pool.
- **🗑️ Trash & Batch Selection Modal**: Select, inspect, and delete individual or all pool items with clear visual indicators.
- **🎨 Custom Tier Names & Colors**: Edit names and background colors for any tier row.
- **📱 Responsive Layouts & Mobile Support**: Toggle between Horizontal and Vertical layouts with optimized touch drag-and-drop and compact margins.
- **💾 Auto-Save & JSON Import/Export**: State automatically persists in local storage. Export tierlists with embedded images for easy sharing.
- **📋 Clipboard & File Drag-and-Drop**: Drag images directly into the page, paste from clipboard, or import ZIP packages.
- **⚡ ES6 & Automated Testing**: Modular JS architecture validated withVitest and JSDOM (45/45 passing tests).

---

## 🚀 Live Demo & Mobile Usage (GitHub Pages)

Access the app instantly on desktop or mobile (Android / iOS):

👉 **[https://fork-you-later.github.io/tiers/](https://fork-you-later.github.io/tiers/)**

### Running as a PWA / Mobile App:
In Chrome or Firefox on mobile, tap **"Add to Home screen"** to install it as a standalone offline web app!

---

## 🛠️ Local Development & Testing

### Running Locally
```bash
npm start
```
Open `http://localhost:3000` in your browser.

### Running Automated Tests
```bash
npm test
```

---

## 📄 License & Attribution

Original work Copyright (C) 2022 silverweed. Distributed under the terms of the DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE (WTFPL).

