# Photobooth Desktop

Desktop photobooth app built with Electron + Preact.

## Features

- Live webcam feed with PNG background overlays
- Background positioning (top, bottom, left, right, center, percentage)
- Landscape 1800×1200 capture (10×15cm at 300 DPI)
- Photo strip mode (4 shots, 2×2 grid)
- Custom countdown (3s, 5s, 10s)
- Mirror mode toggle
- Camera picker for multiple webcams
- Configurable keyboard shortcuts
- Gamepad support (buttons + axes)
- i18n (English, French, German, Spanish)
- Toast notifications
- Optional watermark text
- In-app settings overlay (instead of editing config.json)
- Save to disk and optional print (4×6 Glossy)

Runtime data (config, backgrounds, photos) lives in the OS cache dir, not the
app bundle: `~/.cache/photobooth` (Linux), `~/Library/Caches/photobooth`
(macOS), `%LOCALAPPDATA%\photobooth` (Windows). Defaults are seeded from the
bundle on first run; manage backgrounds in the Settings → Background tab.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ and [Yarn](https://yarnpkg.com/) 1.x

## Setup

```bash
yarn install
cp -r ../photobooth/backgrounds/* backgrounds/  # or add your own PNGs
```

## Development

```bash
yarn electron:dev   # Build bundles + launch Electron (DevTools auto-open)
```

DevTools open automatically in dev mode.

## Packaging

```bash
yarn electron:dist  # Build deb, rpm, AppImage into dist/
```

## Credits

Part of the [Photobooth project](https://github.com/giwi/photobooth) by GiwiSoft.
