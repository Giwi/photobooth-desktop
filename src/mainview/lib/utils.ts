// Promisified timeout for the countdown / capture pacing.
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Case-insensitive single-key match (handles Shift/space quirks).
export function keyMatch(key: string, mapping: string) {
  return key.toLowerCase() === mapping.toLowerCase();
}

// Human-readable gamepad binding for the settings list: "B0" or "A1 +".
export function formatGpBinding(binding: number | { axis: number; dir: number } | undefined): string {
  if (binding == null) return "";
  if (typeof binding === "number") return `B${binding}`;
  return `A${binding.axis} ${binding.dir > 0 ? "+" : "-"}`;
}
