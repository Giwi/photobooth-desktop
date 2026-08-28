// CUPS printer integration: exposes the system printers so the user can pick a
// default printer, then prints to it with `lp -d`. Listing uses `lpstat -p`.
import { spawn, execFile } from "child_process";
import { PrinterConfig } from "./types";

// Returns the list of installed printer names (empty on error / no CUPS).
export function listPrinters(): Promise<string[]> {
  return new Promise((resolve) => {
    execFile("lpstat", ["-p"], (err, stdout) => {
      if (err) return resolve([]);
      const names: string[] = [];
      for (const line of stdout.split("\n")) {
        const m = line.match(/^printer\s+(\S+)/);
        if (m && !line.includes("disabled")) names.push(m[1]);
      }
      resolve(names);
    });
  });
}

// True when `printer` is currently installed (used to render the QR only if a
// usable printer was configured).
export function print(cfg: PrinterConfig, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!cfg.printer) return reject(new Error("No printer selected"));
    const args = ["-d", cfg.printer, filepath];
    const child = spawn("lp", args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(err.trim() || `lp exited ${code}`));
      else resolve();
    });
  });
}
