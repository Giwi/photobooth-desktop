import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Photobooth",
    identifier: "fr.giwi.photobooth",
    version: "1.0.0",
    description: "Webcam photobooth with background overlays",
  },
  build: {
    views: {
      mainview: {
        entrypoint: "src/mainview/index.tsx",
        jsx: {
          runtime: "automatic",
          importSource: "preact",
        },
      },
    },
    copy: {
      "src/mainview/index.html": "views/mainview/index.html",
      "src/mainview/index.css": "views/mainview/index.css",
      "src/mainview/vendor": "views/mainview/vendor",
      "src/mainview/assets/icon.svg": "icon.svg",
      "src/mainview/assets/photobooth.desktop": "photobooth.desktop",
      backgrounds: "backgrounds",
      "config.json": "config.json",
    },
    mac: {
      bundleCEF: false,
      defaultRenderer: "native",
      entitlements: {
        "com.apple.security.device.camera":
          "Photobooth needs camera access to take photos",
      },
    },
    linux: {
      bundleCEF: true,
      defaultRenderer: "cef",
      chromiumFlags: {
        "use-fake-ui-for-media-stream": true,
        "enable-webrtc": true,
      },
    },
    win: {
      bundleCEF: false,
      defaultRenderer: "native",
    },
  },
} satisfies ElectrobunConfig;
