# Photobooth Desktop

Desktop photobooth app built with [Electrobun](https://electrobun.dev/) + Preact + CEF.

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

## Prerequisites

- [Bun](https://bun.sh/) v1.2+
- Linux: bundled CEF (auto-downloaded on first build)

## Setup

```bash
bun install
cp -r ../photobooth/backgrounds/* backgrounds/  # or add your own PNGs
```

## Development

```bash
bun run build   # Build + bundle
bun run dev     # Run dev build
```

DevTools open automatically in dev mode.

## Credits

Part of the [Photobooth project](https://github.com/giwi/photobooth) by GiwiSoft.
