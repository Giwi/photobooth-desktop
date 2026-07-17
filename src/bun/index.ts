import {
  BrowserView,
  BrowserWindow,
  type RPCSchema,
} from "electrobun/bun";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve, basename } from "path";

import en from "../../i18n/en.json";
import de from "../../i18n/de.json";
import es from "../../i18n/es.json";
import fr from "../../i18n/fr.json";

const i18n: Record<string, Record<string, string>> = { en, de, es, fr };

const ROOT = resolve(import.meta.dir, "..");
const PHOTOS_DIR = join(ROOT, "photos");
const BG_DIR = join(
  ROOT,
  process.env.PHOTOBOOTH_BACKGROUNDS || "backgrounds",
);
const CONFIG_PATH = join(ROOT, "config.json");

mkdirSync(PHOTOS_DIR, { recursive: true });
mkdirSync(BG_DIR, { recursive: true });

function readConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(cfg: Record<string, unknown>) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n");
}

// RPC schema: bun handles requests from webview
export type PhotoboothRPC = {
  bun: RPCSchema<{
    requests: {
      getConfig: {
        params: void;
        response: {
          backgrounds: { file: string; position: string | null }[];
          watermark: string | null;
          keys: Record<string, string> | null;
          gamepad: Record<string, any> | null;
          lang: string;
          i18n: Record<string, string>;
        };
      };
      getBackgroundPath: {
        params: { file: string };
        response: string;
      };
      savePhoto: {
        params: { image: string; print: boolean };
        response: { filename: string; error?: string };
      };
      saveConfig: {
        params: {
          lang?: string;
          watermark?: string | null;
          keys?: Record<string, string>;
          gamepad?: Record<string, unknown>;
        };
        response: { ok: boolean };
      };
    };
    messages: {};
  }>;
  webview: RPCSchema<{
    requests: {};
    messages: {};
  }>;
};

const rpc = BrowserView.defineRPC<PhotoboothRPC>({
  maxRequestTime: 10000,
  handlers: {
    requests: {
      getConfig: () => {
        const cfg = readConfig();
        let bgFiles: string[] = [];
        try {
          bgFiles = readdirSync(BG_DIR).filter((f) =>
            /\.(png|jpe?g|svg|webp)$/i.test(f),
          );
        } catch {}

        const bgConfig = cfg.backgrounds || {};
        const lang = cfg.lang || "en";
        const translations = i18n[lang] || i18n.en;

        return {
          backgrounds: bgFiles.map((f) => ({
            file: f,
            position: bgConfig[f]?.position || null,
          })),
          watermark: cfg.watermark || null,
          keys: cfg.keys || null,
          gamepad: cfg.gamepad || null,
          lang,
          i18n: translations,
        };
      },

      getBackgroundPath: ({ file }) => {
        const filepath = join(BG_DIR, basename(file));
        const ext = basename(file).split(".").pop()?.toLowerCase();
        const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "svg" ? "image/svg+xml" : "image/jpeg";
        const b64 = Buffer.from(readFileSync(filepath)).toString("base64");
        return `data:${mime};base64,${b64}`;
      },

      savePhoto: async ({ image, print }) => {
        try {
          const base64 = image.split(",")[1];
          if (!base64) return { filename: "", error: "Invalid image data" };

          const buffer = Buffer.from(base64, "base64");
          const filename = `photo-${Date.now()}.png`;
          const filepath = join(PHOTOS_DIR, filename);

          await Bun.write(filepath, buffer);
          console.log(`Saved ${filepath}`);

          if (print) {
            Bun.spawn([
              "lp",
              "-o",
              "media=4x6in",
              "-o",
              "MediaType=Glossy",
              filepath,
            ]);
            console.log(`Printed ${filename}`);
          }

          return { filename };
        } catch (err) {
          console.error("Save failed:", err);
          return { filename: "", error: (err as Error).message };
        }
      },

      saveConfig: ({ lang, watermark, keys, gamepad }) => {
        const cfg = readConfig();
        if (lang !== undefined) cfg.lang = lang;
        if (watermark !== undefined) cfg.watermark = watermark;
        if (keys !== undefined) cfg.keys = keys;
        if (gamepad !== undefined) cfg.gamepad = gamepad;
        writeConfig(cfg);
        return { ok: true };
      },
    },
    messages: {},
  },
});

// Create main window
const mainWindow = new BrowserWindow({
  title: "Photobooth",
  url: "views://mainview/index.html",
  frame: {
    x: 100,
    y: 50,
    width: 1400,
    height: 900,
  },
  rpc,
  titleBarStyle: "default",
  transparent: false,
  passthrough: false,
  sandbox: false,
});

console.log("Photobooth desktop started!");
console.log(`Backgrounds → ${BG_DIR}`);
console.log(`Photos → ${PHOTOS_DIR}`);

if (process.env.NODE_ENV !== "production") {
  mainWindow.webview.openDevTools();
}
