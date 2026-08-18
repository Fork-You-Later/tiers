# Offline Tierlist Maker

A modular, lightweight, web-based tool for creating custom tierlists entirely offline in your browser.

> **Credits**: Originally created by [silverweed](https://github.com/silverweed) ([silverweed/tiers](https://github.com/silverweed/tiers)) under the WTFPL License. Refactored into ES6 modules with automated unit testing.

---

## Features

- **Offline & Private**: All image processing and tierlist generation happens locally in your browser. No server uploads or accounts required.
- **Custom Tier Names & Colors**: Edit names and background colors for any tier.
- **Dynamic Rows**: Add tiers above/below existing rows, or delete tiers (returning images to the pool).
- **JSON Import & Export**: Export your tierlists with embedded image data to back them up or transfer between devices.
- **Clipboard & File Support**: Drag and drop images, select files, or directly paste images from your clipboard.
- **Horizontal & Vertical Layouts**: Toggle between horizontal and vertical display modes.
- **Modular ES6 Architecture**: Structured JS modules (`src/`) and CSS (`css/`).
- **Automated Unit Testing**: Tested with Vitest and JSDOM.

---

## Direct Mobile Usage (GitHub Pages)

You can use this app directly on your **Android phone or tablet** without needing a laptop or running `npm start`:

1. Go to your repository on GitHub: `https://github.com/Fork-You-Later/tiers`
2. Go to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select `Deploy from a branch`.
4. Under **Branch**, select `main` and `/ (root)`, then click **Save**.
5. After a minute, GitHub will publish your site live at:
   **`https://fork-you-later.github.io/tiers/`**

Open that URL in Chrome or Firefox on your Android mobile device! You can also select **"Add to Home screen"** in Android Chrome to launch it like a native app.

---

## Local Development & Testing

### Running Locally
```bash
npm start
```
Open `http://localhost:3000` in your browser.

### Running Unit Tests
```bash
npm test
```

---

## License & Attribution

Original work Copyright (C) 2022 silverweed. Distributed under the terms of the DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE (WTFPL).
