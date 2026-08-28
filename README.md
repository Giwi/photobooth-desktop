# Photobooth Desktop

Desktop photobooth app built with Electron + Preact.

<p align="center"><a href="https://giwi.github.io/photobooth-desktop"><img src="docs/assets/icon.png" width="160" alt="Photobooth Desktop"></a></p>

Product page (GitHub Pages): <https://giwi.github.io/photobooth-desktop>

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
- Integrations (photo sharing via Nextcloud, Google Drive, Dropbox, OneDrive,
  FTP/SFTP, SMTP email, and a CUPS printer picker)

Runtime data (config, backgrounds) lives in the OS cache dir, not the app
bundle: `~/.cache/photobooth` (Linux), `~/Library/Caches/photobooth` (macOS),
`%LOCALAPPDATA%\photobooth` (Windows). Photos are saved in the OS-specific
Pictures folder: `~/Pictures/photobooth` (Linux/macOS), `%USERPROFILE%\Pictures\photobooth`
(Windows). Defaults are seeded from the bundle on first run; manage backgrounds
in the Settings → Background tab.

## Integrations

Integrations let guests grab their photos on their own phone without a
computer, or let the booth send/print every shot automatically. Configure
them in Settings → Integrations.

Every integration has an **enabled** toggle plus its own fields.

### Nextcloud

- Set the server URL, login, password, and destination folder.
- After each capture the photo is uploaded over WebDAV, and a **public share
  link** is created via the Nextcloud OCS Share API (`shareType=3`, read-only).
- A QR code with the share link is overlaid on the preview so a phone can open
  the download directly. The QR auto-hides after a configurable TTL or when the
  next capture starts.

### Google Drive, Dropbox, OneDrive (OAuth)

- Each uses **OAuth 2.0** (PKCE) and uploads full-resolution photos to a folder
  you choose, then creates a public share link shown as a QR code on preview.
- You must supply your own app credentials (Client ID, and for Dropbox also an
  App secret) from the provider's developer console, and authorize once in the
  browser. Authorized tokens are stored in the settings config.
- Redirect URI to register: `http://127.0.0.1:5756/callback`.

### FTP / SFTP

- Uploads shots via `curl` to any FTP/FTPS/SFTP server using host, port, login,
  password and target folder. No QR/share link is created (server has no public
  web URL), so this is for centralizing backups rather than guest download.

### Email (SMTP)

- When email is enabled, the preview shows an extra field where a guest types
  their address; on save the photo is emailed to that address.

### Printer

- Choose from the printers detected on the system (via CUPS `lpstat`) and the
  booth sends prints to that printer with `lp -d <printer>`.

Set the QR expiry (in seconds) with the dedicated setting; the default is 60 s.

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
