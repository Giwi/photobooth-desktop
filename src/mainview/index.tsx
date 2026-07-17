import { render } from "preact";
import { App } from "./App";

console.log("[photobooth] index.tsx executing, #app =", document.getElementById("app"));

try {
  render(<App />, document.getElementById("app")!);
  console.log("[photobooth] render() completed");
} catch (err) {
  console.error("[photobooth] render() failed:", err);
}
