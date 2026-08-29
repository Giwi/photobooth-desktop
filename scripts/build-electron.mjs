// Cross-platform build for Electron main, preload, and renderer bundles.
// Uses esbuild's JS API directly, so it works on Windows, Linux, and macOS
// with no shell-specific features.
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

async function bundle({ entry, outfile, platform, format }) {
  await build({
    entryPoints: [join(root, entry)],
    outfile: join(root, outfile),
    bundle: true,
    platform,
    format,
    external: platform === "node" ? ["electron"] : undefined,
    logLevel: "info",
  });
}

if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "renderer"), { recursive: true });

await bundle({ entry: "src/main/index.ts", outfile: "dist/main.cjs", platform: "node", format: "cjs" });
await bundle({ entry: "src/main/preload.ts", outfile: "dist/preload.cjs", platform: "node", format: "cjs" });
await bundle({ entry: "src/main/splash-preload.ts", outfile: "dist/splash-preload.cjs", platform: "node", format: "cjs" });
await bundle({ entry: "src/mainview/index.tsx", outfile: "dist/renderer/index.js", platform: "browser", format: "iife" });

const renderer = join(dist, "renderer");
const staticFiles = [
  "src/mainview/html/index.html",
  "src/mainview/styles/index.css",
  "src/mainview/html/splash.html",
  "src/mainview/assets/splash.png",
  "src/mainview/assets/icon.png",
  "src/mainview/assets/nextcloud.svg",
];
for (const f of staticFiles) {
  cpSync(join(root, f), join(renderer, f.split("/").pop()));
}
cpSync(join(root, "src/mainview/vendor"), join(renderer, "vendor"), { recursive: true });

console.log("Built dist/main.cjs dist/preload.cjs dist/renderer/");
