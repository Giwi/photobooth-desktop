// Printer integration: uses Electron's built-in print API so it works on
// Linux, Windows, and macOS. Listing uses webContents.getPrintersAsync();
// printing renders the photo full-page on the printer's 2x3in glossy sheet,
// then prints silently to the chosen (or default) printer.
//
// Orientation handling is platform-specific: Linux/macOS honor the requested
// landscape 3x2 page, so the 3:2 capture fills it directly. Windows silently
// feeds/exposes the 2x3 glossy as portrait regardless of the requested page, so
// on Windows we rotate the photo 90deg and print onto the driver's loaded
// 2x3 sheet to get an upright, full-bleed photo.
import { app, BrowserWindow, WebContents } from "electron";
import { readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { PNG } from "pngjs";
import { PrinterConfig } from "./types";

const IS_WINDOWS = process.platform === "win32";

// Linux/macOS: 3in x 2in (landscape) in microns, passed explicitly since these
// platforms honor the page size. Windows uses the driver's loaded paper size
// (2x3 glossy) instead — see print() below.
const PAGE_SIZE = { width: 76200, height: 50800 };

// Rotates a PNG image 90° clockwise so the 3:2 landscape capture fills the
// portrait 2x3 glossy sheet upright and edge to edge (Windows only).
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

// Render a full-page photo, filling the sheet edge to edge with no white
// borders and no distortion. On Linux/macOS the page is landscape 3x2; on
// Windows it uses the printer driver's loaded 2x3 glossy sheet.
function buildPrintHtml(imageSrc: string): string {
  const pageRule = IS_WINDOWS ? "@page { margin: 0; }" : "@page { size: 3in 2in; margin: 0; }";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    ${pageRule}
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

    // Windows prints the 2x3 glossy as portrait no matter what, so rotate the
    // 3:2 landscape photo to 2:3 to print it upright and full-bleed. Linux and
    // macOS honor the landscape page directly, so no rotation is needed.
    let imagePath = filepath;
    if (IS_WINDOWS) {
      try {
        rotateClockwise(filepath, rotatedPath);
        imagePath = rotatedPath;
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
    }

    const imageSrc = "file:///" + imagePath.replace(/\\/g, "/");
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
            // Linux/macOS: explicit landscape 3x2 page, honored by the print
            // backend. Windows: use the printer's own loaded paper (2x3 glossy)
            // so the photo fills the actual sheet instead of a custom page size
            // being centered/scaled in the printable area. Orientation on
            // Windows is fixed by rotating the photo, not by the page size.
            pageSize: IS_WINDOWS ? undefined : PAGE_SIZE,
            usePrinterDefaultPageSize: IS_WINDOWS,
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
