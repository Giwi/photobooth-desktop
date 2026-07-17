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

## Architecture

```
photobooth-desktop/
├── electrobun.config.ts          # Build config (entrypoint, JSX, copy)
├── src/
│   ├── bun/
│   │   └── index.ts              # Main process (RPC handlers, file I/O, i18n)
│   └── mainview/
│       ├── index.tsx              # Mount point (3 lines)
│       ├── App.tsx                # Root component (state, effects, capture flow)
│       ├── index.html             # HTML shell
│       ├── index.css              # All styling (~800 lines)
│       ├── lib/
│       │   ├── constants.ts       # W, H, defaults, action labels
│       │   ├── canvas.ts          # Drawing helpers (bg, video, watermark, strip)
│       │   └── utils.ts           # sleep, keyMatch, formatGpBinding
│       ├── components/
│       │   ├── BackgroundsBar.tsx  # Thumbnail strip with preloaded data URLs
│       │   ├── Viewport.tsx        # Video, canvas, countdown, flash, preview
│       │   ├── SettingsBar.tsx     # Mirror, strip, help, settings buttons
│       │   ├── SettingsOverlay.tsx # In-app settings panel
│       │   ├── ToastContainer.tsx  # Notification toasts
│       │   └── ClickAway.tsx       # Click-outside helper
│       └── vendor/                 # Bootstrap Icons (base64-inlined)
├── backgrounds/                   # Overlay images (PNG, JPG, WEBP, SVG)
├── i18n/                          # Translation files (en, fr, de, es)
└── config.json                    # User config (auto-managed by settings)
```

## Configuration

Edit `config.json` or use the in-app **Settings** panel (gear icon):

- Language (EN/FR/DE/ES)
- Webcam selection
- Countdown duration (3s/5s/10s)
- Watermark text
- Keyboard bindings (click to rebind)
- Gamepad bindings (click to rebind, press button or move axis)

## Tech Stack

- **UI**: Preact with automatic JSX runtime via `preact/jsx-runtime`
- **Framework**: Electrobun — Bun as runtime, CEF as webview on Linux
- **RPC**: Typed IPC between bun process and webview (replaces Express HTTP API)
- **State**: Preact hooks (useState, useEffect, useRef, useCallback)
- **Canvas**: Compositor draws video + background + watermark → data URL → save/print

## Credits

Part of the [Photobooth project](https://github.com/giwi/photobooth) by GiwiSoft.
