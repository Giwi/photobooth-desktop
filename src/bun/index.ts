import {
  BrowserView,
  BrowserWindow,
  type RPCSchema,
} from "electrobun/bun";
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, rmSync, cpSync } from "fs";
import { join, resolve, basename } from "path";
import { homedir } from "os";

import en from "../../i18n/en.json";
import de from "../../i18n/de.json";
import es from "../../i18n/es.json";
import fr from "../../i18n/fr.json";

const i18n: Record<string, Record<string, string>> = { en, de, es, fr };

const ROOT = resolve(import.meta.dir, "..");
const BUNDLE_BG_DIR = join(ROOT, "backgrounds");
const BUNDLE_CONFIG_PATH = join(ROOT, "config.json");

// Runtime user data lives in the OS cache dir, not the app bundle (bundle is
// wiped on rebuild / read-only when installed).
function dataDir(): string {
  const home = homedir();
  if (process.platform === "darwin") return join(home, "Library", "Caches", "photobooth");
  if (process.platform === "win32")
    return join(process.env.LOCALAPPDATA || join(home, "AppData", "Local"), "photobooth");
  return join(process.env.XDG_CACHE_HOME || join(home, ".cache"), "photobooth");
}

const DATA_DIR = dataDir();
const PHOTOS_DIR = join(DATA_DIR, "photos");
const BG_DIR = join(DATA_DIR, "backgrounds");
const CONFIG_PATH = join(DATA_DIR, "config.json");

mkdirSync(PHOTOS_DIR, { recursive: true });
mkdirSync(BG_DIR, { recursive: true });

// Seed defaults from the bundle on first run
try {
  if (readdirSync(BG_DIR).length === 0) {
    for (const f of readdirSync(BUNDLE_BG_DIR)) {
      if (/\.(png|jpe?g|svg|webp)$/i.test(f)) cpSync(join(BUNDLE_BG_DIR, f), join(BG_DIR, f));
    }
  }
} catch {}
try {
  if (!existsSync(CONFIG_PATH) && existsSync(BUNDLE_CONFIG_PATH)) cpSync(BUNDLE_CONFIG_PATH, CONFIG_PATH);
} catch {}

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

// Copy an image into BG_DIR with sanitized name and dedupe; throws on bad type
function storeBackground(name: string, data: Uint8Array) {
  const ext = basename(name).split(".").pop()?.toLowerCase() || "png";
  if (!/^(png|jpe?g|webp)$/i.test(ext)) {
    throw new Error("Unsupported image type (png, jpg, webp)");
  }
  const safe = basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  let filename = safe;
  let filepath = join(BG_DIR, filename);
  let i = 1;
  while (existsSync(filepath)) {
    filename = `${safe.replace(new RegExp(`\\.${ext}$`, "i"), "")}-${i++}.${ext}`;
    filepath = join(BG_DIR, filename);
  }
  writeFileSync(filepath, data);
  console.log(`Imported background ${filename}`);
  return filename;
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
      importBackground: {
        params: { name: string; dataUrl: string };
        response: { ok: boolean; error?: string; file?: string };
      };
      importBackgroundFromPath: {
        params: { path: string };
        response: { ok: boolean; error?: string; file?: string };
      };
      deleteBackground: {
        params: { file: string };
        response: { ok: boolean; error?: string };
      };
      setBackgroundPosition: {
        params: { file: string; position: string | null };
        response: { ok: boolean; error?: string };
      };
      exportSettings: {
        params: void;
        response: { path: string; error?: string };
      };
      importSettings: {
        params: { json: string };
        response: { ok: boolean; error?: string };
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

      importBackground: ({ name, dataUrl }) => {
        const base64 = dataUrl.split(",")[1];
        if (!base64) return { ok: false, error: "Invalid image data" };
        try {
          const file = storeBackground(name, Buffer.from(base64, "base64"));
          return { ok: true, file };
        } catch (err) {
          return { ok: false, error: (err as Error).message };
        }
      },

      importBackgroundFromPath: ({ path }) => {
        try {
          const buffer = readFileSync(path);
          const file = storeBackground(basename(path), buffer);
          return { ok: true, file };
        } catch (err) {
          return { ok: false, error: (err as Error).message };
        }
      },

      deleteBackground: ({ file }) => {
        const safe = basename(file);
        try {
          rmSync(join(BG_DIR, safe), { force: true });
        } catch (err) {
          return { ok: false, error: (err as Error).message };
        }
        const cfg = readConfig();
        if (cfg.backgrounds?.[safe]) {
          delete cfg.backgrounds[safe];
          writeConfig(cfg);
        }
        console.log(`Deleted background ${safe}`);
        return { ok: true };
      },

      setBackgroundPosition: ({ file, position }) => {
        const safe = basename(file);
        const cfg = readConfig();
        cfg.backgrounds = cfg.backgrounds || {};
        cfg.backgrounds[safe] = { ...(cfg.backgrounds[safe] || {}), position };
        writeConfig(cfg);
        return { ok: true };
      },

      exportSettings: () => {
        try {
          const cfg = readConfig();
          const bgs: Record<string, string> = {};
          for (const f of readdirSync(BG_DIR)) {
            if (/\.(png|jpe?g|webp)$/i.test(f)) {
              bgs[f] = readFileSync(join(BG_DIR, f)).toString("base64");
            }
          }
          const payload = JSON.stringify({ config: cfg, backgrounds: bgs }, null, 2);
          const dir = existsSync(join(homedir(), "Downloads"))
            ? join(homedir(), "Downloads")
            : homedir();
          const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
          const path = join(dir, `photobooth-settings-${stamp}.json`);
          writeFileSync(path, payload);
          console.log(`Exported settings to ${path}`);
          return { path };
        } catch (err) {
          return { path: "", error: (err as Error).message };
        }
      },

      importSettings: ({ json }) => {
        try {
          const data = JSON.parse(json);
          const cfg = data && typeof data === "object" && data.config && typeof data.config === "object"
            ? data.config
            : {};
          const bgs = data && typeof data === "object" && data.backgrounds && typeof data.backgrounds === "object"
            ? data.backgrounds
            : {};
          for (const [name, b64] of Object.entries(bgs as Record<string, unknown>)) {
            if (typeof b64 !== "string") continue;
            const safe = basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
            const ext = safe.split(".").pop()?.toLowerCase() || "";
            if (!/^(png|jpe?g|webp)$/.test(ext)) continue;
            writeFileSync(join(BG_DIR, safe), Buffer.from(b64, "base64"));
          }
          writeConfig(cfg);
          console.log("Imported settings");
          return { ok: true };
        } catch (err) {
          return { ok: false, error: (err as Error).message };
        }
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
console.log(`Data dir → ${DATA_DIR}`);
console.log(`Backgrounds → ${BG_DIR}`);
console.log(`Photos → ${PHOTOS_DIR}`);

if (process.env.NODE_ENV !== "production") {
  mainWindow.webview.openDevTools();
}
