// Printer integration: uses Electron's built-in print API so it works on
// Linux, Windows, and macOS. Listing uses webContents.getPrintersAsync();
// printing renders the photo full-page on the printer's selected sheet (2x3in
// glossy), then prints silently to the chosen (or default) printer.
import { app, BrowserWindow, WebContents } from "electron";
import { readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { PNG } from "pngjs";
import { PrinterConfig } from "./types";

// 3in x 2in (landscape) in microns. Passing width > height forces a landscape
// sheet; relying on the driver's default page size often yields portrait 2x3.
const PAGE_SIZE = { width: 76200, height: 50800 };

// Rotates a PNG image 90° clockwise so the printed photo comes out landscape
// even when the printer driver insists on a portrait sheet. Returns the path to
// a new temp file.
function rotateClockwise(inputPath: string, outputPath: string): void {
  const png = PNG.sync.read(readFileSync(inputPath));
  const { width, height } = png;
  const out = new PNG({ width: height, height: width });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (width * y + x) << 2;
      const dstX = height - 1 - y;
      const dstY = x;
      const dstIdx = (out.width * dstY + dstX) << 2;
      out.data[dstIdx] = png.data[srcIdx];
      out.data[dstIdx + 1] = png.data[srcIdx + 1];
      out.data[dstIdx + 2] = png.data[srcIdx + 2];
      out.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }
  writeFileSync(outputPath, PNG.sync.write(out));
}

// Returns the list of installed printer names (empty on error / no printers).
export function listPrinters(win?: WebContents): Promise<string[]> {
  return new Promise((resolve) => {
    if (!win) return resolve([]);
    win
      .getPrintersAsync()
      .then((printers) => resolve(printers.map((p) => p.name)))
      .catch(() => resolve([]));
  });
}

// Render a full-page landscape (3:2) photo, filling the sheet edge to edge with
// no white borders and no distortion (captures are 3:2, matching 2x3 paper).
function buildPrintHtml(imageSrc: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: 3in 2in; margin: 0; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
    body { display: flex; }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
  </style></head><body><img src="${imageSrc}"></body></html>`;
}

// Prints `filepath` silently to the configured printer, or the OS default when
// none was chosen.
export function print(cfg: PrinterConfig, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = app.getPath("temp");
    const id = randomUUID();
    const htmlPath = join(dir, `photobooth-print-${id}.html`);
    const rotatedPath = join(dir, `photobooth-print-${id}-rotated.png`);

    // Rotate the photo 90° so it prints landscape even on a portrait sheet.
    try {
      rotateClockwise(filepath, rotatedPath);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const imageSrc = "file:///" + rotatedPath.replace(/\\/g, "/");
    try {
      writeFileSync(htmlPath, buildPrintHtml(imageSrc), "utf8");
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    // The print window is shown off-screen: on Windows, calling
    // webContents.print({ silent: true }) from a never-shown window can print
    // nothing at all. Keeping it visible but positioned far off the screen is a
    // reliable cross-platform workaround.
    const win = new BrowserWindow({
      show: true,
      x: -20000,
      y: -20000,
      width: 600,
      height: 400,
      frame: false,
      webPreferences: { sandbox: true, contextIsolation: true },
    });
    let settled = false;
    const cleanup = () => {
      try {
        rmSync(htmlPath, { force: true });
        rmSync(rotatedPath, { force: true });
      } catch {
        /* ignore cleanup errors */
      }
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      win.destroy();
      cleanup();
    };
    const fail = (msg: string) => {
      finish();
      reject(new Error(msg));
    };

    win.webContents.once("did-fail-load", (_e, code, desc) =>
      fail(`Cannot render print page (${code} ${desc}).`)
    );
    win.webContents.once("did-finish-load", () => {
      // Give the embedded <img> time to decode before capturing, otherwise the
      // first rapid print can silently produce a blank page on Windows.
      setTimeout(() => {
        const deviceName = cfg.printer || undefined;
        win.webContents.print(
          {
            silent: true,
            deviceName,
            printBackground: true,
            // Force a landscape 3x2 sheet: width > height selects landscape.
            pageSize: PAGE_SIZE,
          },
          (ok, reason) => {
            win.destroy();
            cleanup();
            settled = true;
            if (ok) resolve();
            else reject(new Error(reason || "Print failed"));
          }
        );
      }, 150);
    });
    win.loadFile(htmlPath);
  });
}
