// Canvas / capture resolution. Fixed 3:2 (1800x1200) — all compositing,
// background fitting and strips are computed against this.
export const W = 1800;
export const H = 1200;

// Gamepad stick travel needed to trigger an axis-bound action.
export const AXIS_THRESHOLD = 0.5;

// Fallback thumbnail shown for backgrounds that fail to load.
export const NO_BG_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="56"><rect x="4" y="4" width="72" height="48" rx="6" fill="none" stroke="#888" stroke-width="2.5"/><line x1="18" y1="14" x2="62" y2="42" stroke="#888" stroke-width="2.5" stroke-linecap="round"/><line x1="62" y1="14" x2="18" y2="42" stroke="#888" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  );

// Default keyboard bindings, overridable in Settings.
export const DEFAULT_KEY_MAP: Record<string, string> = {
  capture: " ", save: "s", print: "Enter", cancel: "Escape",
  prevBg: "ArrowLeft", nextBg: "ArrowRight", mirror: "m", strip: "t",
};

// Default gamepad bindings: numbers are button indices, objects are axes
// (axis index + direction: 1 = positive, -1 = negative).
export const DEFAULT_GP_MAP: Record<string, number | { axis: number; dir: number }> = {
  capture: 0, save: 2, print: 3, cancel: 1,
  prevBg: 14, nextBg: 15, mirror: 8, strip: 9,
};

// Maps an action id to its i18n label key (used by help popup + Settings).
export const ACTION_LABELS: Record<string, string> = {
  capture: "help.capture", save: "help.save", print: "help.print",
  cancel: "help.discard", prevBg: "help.prevBg", nextBg: "help.nextBg",
  mirror: "help.mirror", strip: "help.strip",
};

// Friendly labels for special keys in the help popup.
export const KEY_DISPLAY: Record<string, string> = {
  " ": "Space", ArrowLeft: "\u2190", ArrowRight: "\u2192",
  Enter: "\u21B5", Escape: "Esc",
};
