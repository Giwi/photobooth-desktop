// Printer integration: uses Electron's built-in print API so it works on
// Linux, Windows, and macOS. Listing uses webContents.getPrintersAsync();
// printing renders the photo full-bleed on a 4x6in landscape page then prints
// silently to the chosen (or default) printer.
import { BrowserWindow, WebContents } from "electron";
import { readFileSync } from "fs";
import { PrinterConfig } from "./types";

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

// Render a 4x6in landscape page with the photo filling it edge to edge.
function buildPrintHtml(filepath: string): string {
  const b64 = readFileSync(filepath).toString("base64");
  const src = `data:image/png;base64,${b64}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: 6in 4in; margin: 0; }
    html, body { margin: 0; width: 6in; height: 4in; }
    img { width: 6in; height: 4in; object-fit: fill; display: block; }
  </style></head><body><img src="${src}"></body></html>`;
}

// Prints `filepath` silently to the configured printer, or the OS default when
// none was chosen.
export function print(cfg: PrinterConfig, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true },
    });
    win.webContents.once("did-fail-load", (_e, code, desc) => {
      win.destroy();
      reject(new Error(`Cannot render print page (${code} ${desc}).`));
    });
    win.webContents.once("did-finish-load", () => {
      const deviceName = cfg.printer || undefined;
      win.webContents.print({ silent: true, deviceName, printBackground: true }, (ok, reason) => {
        win.destroy();
        if (ok) resolve();
        else reject(new Error(reason || "Print failed"));
      });
    });
    win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(buildPrintHtml(filepath)));
  });
}
