export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function keyMatch(key: string, mapping: string) {
  return key.toLowerCase() === mapping.toLowerCase();
}

export function formatGpBinding(binding: number | { axis: number; dir: number } | undefined): string {
  if (binding == null) return "";
  if (typeof binding === "number") return `B${binding}`;
  return `A${binding.axis} ${binding.dir > 0 ? "+" : "-"}`;
}
